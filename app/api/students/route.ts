import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectMongo } from '@/lib/mongo';
import { TmsEnrollmentModel, TmsStudentModel } from '@/lib/models/tms';
import { Student } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const hasOwn = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);

const sanitizeText = (value: unknown, max = 320) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

const normalizeEmail = (value: unknown) => sanitizeText(value, 320).toLowerCase();

const sanitizeStringArray = (value: unknown, max = 120) =>
  Array.isArray(value)
    ? value
        .map((item) => sanitizeText(item, max))
        .filter(Boolean)
    : [];

const normalizeStatus = (value: unknown): Student['status'] => {
  if (value === 'inactive') return 'inactive';
  if (value === 'active') return 'active';
  return 'active';
};

type EnrollmentShape = {
  studentId?: string;
  batchId?: string | null;
  courseIds?: string[];
  testIds?: string[];
};

const toStudent = (raw: any, enrollment?: EnrollmentShape): Student => {
  const email = normalizeEmail(raw?.email || enrollment?.studentId);
  const isSuspended = Boolean(raw?.isSuspended);
  const status = normalizeStatus(raw?.status || (isSuspended ? 'inactive' : 'active'));
  return {
    id: email,
    name: sanitizeText(raw?.name, 160) || (email ? email.split('@')[0] : 'Student'),
    mobile: sanitizeText(raw?.mobile, 30),
    email,
    batchId: sanitizeText(enrollment?.batchId, 120) || null,
    courseIds: sanitizeStringArray(enrollment?.courseIds, 120),
    enrolledTestIds: sanitizeStringArray(enrollment?.testIds, 120),
    status,
  };
};

export async function GET(request: Request) {
  try {
    await connectMongo();
    const url = new URL(request.url);
    const id = sanitizeText(url.searchParams.get('id'), 320);
    const email = normalizeEmail(url.searchParams.get('email'));

    const enrollmentDocs = await TmsEnrollmentModel.find({}).lean();
    const enrollmentMap = new Map<string, EnrollmentShape>();
    enrollmentDocs.forEach((doc) => {
      const key = normalizeEmail(doc.studentId);
      if (key) enrollmentMap.set(key, doc);
    });

    if (id || email) {
      const lookupEmail = normalizeEmail(email || id);
      if (lookupEmail) {
        const studentDoc = await TmsStudentModel.findOne({ email: lookupEmail }).lean();
        if (!studentDoc && !enrollmentMap.has(lookupEmail)) {
          if (!lookupEmail.includes('@')) {
            return NextResponse.json(null);
          }
          const synthetic = {
            email: lookupEmail,
            name: lookupEmail.split('@')[0] || 'Student',
            mobile: '',
            status: 'active',
          };
          await TmsStudentModel.updateOne(
            { email: lookupEmail },
            {
              $set: synthetic,
              $setOnInsert: { createdAt: new Date() },
            },
            { upsert: true }
          );
          return NextResponse.json(toStudent(synthetic));
        }
        return NextResponse.json(toStudent(studentDoc || { email: lookupEmail }, enrollmentMap.get(lookupEmail)));
      }

      if (mongoose.Types.ObjectId.isValid(id)) {
        const studentDoc = await TmsStudentModel.findById(id).lean();
        if (!studentDoc) return NextResponse.json(null);
        const studentEmail = normalizeEmail(studentDoc.email);
        return NextResponse.json(toStudent(studentDoc, enrollmentMap.get(studentEmail)));
      }
      return NextResponse.json(null);
    }

    const studentDocs = await TmsStudentModel.find({ email: { $exists: true, $ne: '' } }).lean();
    const students = new Map<string, Student>();

    studentDocs.forEach((doc) => {
      const entry = toStudent(doc, enrollmentMap.get(normalizeEmail(doc.email)));
      if (entry.email) {
        students.set(entry.email, entry);
      }
    });

    enrollmentMap.forEach((enrollment, studentId) => {
      if (!students.has(studentId)) {
        students.set(studentId, toStudent({ email: studentId }, enrollment));
      }
    });

    return NextResponse.json(
      Array.from(students.values()).sort((a, b) => a.name.localeCompare(b.name))
    );
  } catch (error) {
    console.error('[api/students] Failed to fetch students:', error);
    return NextResponse.json({ message: 'Failed to fetch students' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await connectMongo();
    const body = (await request.json()) as
      | { id?: string; patch?: Partial<Student> }
      | Partial<Student>;

    const id =
      sanitizeText((body as { id?: string }).id, 320) ||
      sanitizeText(new URL(request.url).searchParams.get('id'), 320);

    if (!id) {
      return NextResponse.json({ message: 'Student ID is required.' }, { status: 400 });
    }

    const source =
      typeof (body as { patch?: Partial<Student> }).patch === 'object' &&
      (body as { patch?: Partial<Student> }).patch !== null
        ? ((body as { patch?: Partial<Student> }).patch as Partial<Student>)
        : (body as Partial<Student>);

    let existingDoc: any = null;
    let existingEmail = normalizeEmail(id);

    if (existingEmail.includes('@')) {
      existingDoc = await TmsStudentModel.findOne({ email: existingEmail });
    } else if (mongoose.Types.ObjectId.isValid(id)) {
      existingDoc = await TmsStudentModel.findById(id);
      existingEmail = normalizeEmail(existingDoc?.email);
    }

    const targetEmail = normalizeEmail(source.email) || existingEmail;
    if (!targetEmail) {
      return NextResponse.json({ message: 'Valid student email is required.' }, { status: 400 });
    }

    const studentPatch: Record<string, unknown> = {
      email: targetEmail,
    };
    if (hasOwn(source, 'name')) {
      studentPatch.name = sanitizeText(source.name, 160);
    }
    if (hasOwn(source, 'mobile')) {
      studentPatch.mobile = sanitizeText(source.mobile, 30);
    }
    if (hasOwn(source, 'status')) {
      studentPatch.status = normalizeStatus(source.status);
    }

    if (existingDoc?._id) {
      await TmsStudentModel.updateOne({ _id: existingDoc._id }, { $set: studentPatch });
    } else {
      await TmsStudentModel.updateOne(
        { email: targetEmail },
        { $set: studentPatch, $setOnInsert: { createdAt: new Date() } },
        { upsert: true }
      );
    }

    if (existingEmail && existingEmail !== targetEmail) {
      await TmsEnrollmentModel.updateOne(
        { studentId: existingEmail },
        { $set: { studentId: targetEmail } }
      );
    }

    const enrollmentPatch: Record<string, unknown> = {};
    if (hasOwn(source, 'batchId')) {
      enrollmentPatch.batchId = sanitizeText(source.batchId, 120) || null;
    }
    if (hasOwn(source, 'courseIds')) {
      enrollmentPatch.courseIds = sanitizeStringArray(source.courseIds, 120);
    }
    if (hasOwn(source, 'enrolledTestIds')) {
      enrollmentPatch.testIds = sanitizeStringArray(source.enrolledTestIds, 120);
    }
    if (hasOwn(source, 'status')) {
      enrollmentPatch.status = normalizeStatus(source.status) === 'inactive' ? 'expired' : 'active';
    }

    if (Object.keys(enrollmentPatch).length > 0) {
      await TmsEnrollmentModel.updateOne(
        { studentId: targetEmail },
        { $set: { studentId: targetEmail, ...enrollmentPatch }, $setOnInsert: { createdAt: new Date() } },
        { upsert: true }
      );
    }

    const [studentDoc, enrollmentDoc] = await Promise.all([
      TmsStudentModel.findOne({ email: targetEmail }).lean(),
      TmsEnrollmentModel.findOne({ studentId: targetEmail }).lean(),
    ]);

    return NextResponse.json(toStudent(studentDoc || { email: targetEmail }, enrollmentDoc || undefined));
  } catch (error) {
    console.error('[api/students] Failed to update student:', error);
    return NextResponse.json({ message: 'Failed to update student' }, { status: 500 });
  }
}
