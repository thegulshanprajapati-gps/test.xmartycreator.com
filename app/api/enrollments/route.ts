import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongo';
import { TmsBatchModel, TmsEnrollmentModel, TmsStudentModel } from '@/lib/models/tms';
import { Enrollment } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const hasOwn = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);

const sanitizeText = (value: unknown, max = 320) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

const normalizeId = (value: unknown) => sanitizeText(value, 320).toLowerCase();

const sanitizeStringArray = (value: unknown, max = 120) =>
  Array.isArray(value)
    ? value
        .map((item) => sanitizeText(item, max))
        .filter(Boolean)
    : [];

const normalizeStatus = (value: unknown): Enrollment['status'] =>
  value === 'expired' ? 'expired' : 'active';

const toEnrollment = (raw: any): Enrollment => {
  const studentId = normalizeId(raw?.studentId);
  return {
    id: studentId,
    studentId,
    batchId: sanitizeText(raw?.batchId, 120) || null,
    courseIds: sanitizeStringArray(raw?.courseIds, 120),
    testIds: sanitizeStringArray(raw?.testIds, 120),
    status: normalizeStatus(raw?.status),
  };
};

async function buildMergedEnrollments() {
  const [studentDocs, enrollmentDocs] = await Promise.all([
    TmsStudentModel.find({ email: { $exists: true, $ne: '' } }).select({ email: 1 }).lean(),
    TmsEnrollmentModel.find({}).lean(),
  ]);

  const studentIds = new Set(
    studentDocs
      .map((doc) => normalizeId(doc.email))
      .filter(Boolean)
  );

  const enrollmentMap = new Map<string, Enrollment>();
  enrollmentDocs.forEach((doc) => {
    const normalized = toEnrollment(doc);
    if (normalized.studentId) {
      enrollmentMap.set(normalized.studentId, normalized);
      studentIds.add(normalized.studentId);
    }
  });

  return Array.from(studentIds)
    .map((studentId) => {
      const existing = enrollmentMap.get(studentId);
      if (existing) return existing;
      return {
        id: studentId,
        studentId,
        batchId: null,
        courseIds: [],
        testIds: [],
        status: 'active',
      } satisfies Enrollment;
    })
    .sort((a, b) => a.studentId.localeCompare(b.studentId));
}

export async function GET(request: Request) {
  try {
    await connectMongo();
    const url = new URL(request.url);
    const id = normalizeId(url.searchParams.get('id'));
    const studentId = normalizeId(url.searchParams.get('studentId'));
    const targetId = studentId || id;

    const enrollments = await buildMergedEnrollments();
    if (targetId) {
      const found =
        enrollments.find((entry) => entry.studentId === targetId || entry.id === targetId) || null;
      return NextResponse.json(found);
    }
    return NextResponse.json(enrollments);
  } catch (error) {
    console.error('[api/enrollments] Failed to fetch enrollments:', error);
    return NextResponse.json({ message: 'Failed to fetch enrollments' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await connectMongo();
    const body = (await request.json()) as
      | { id?: string; patch?: Partial<Enrollment> }
      | Partial<Enrollment>;

    const id =
      normalizeId((body as { id?: string }).id) ||
      normalizeId(new URL(request.url).searchParams.get('id'));

    const source =
      typeof (body as { patch?: Partial<Enrollment> }).patch === 'object' &&
      (body as { patch?: Partial<Enrollment> }).patch !== null
        ? ((body as { patch?: Partial<Enrollment> }).patch as Partial<Enrollment>)
        : (body as Partial<Enrollment>);

    const studentId = normalizeId(source.studentId) || id;
    if (!studentId) {
      return NextResponse.json({ message: 'Student ID is required for enrollment update.' }, { status: 400 });
    }

    const patch: Record<string, unknown> = {};
    if (hasOwn(source, 'batchId')) patch.batchId = sanitizeText(source.batchId, 120) || null;
    if (hasOwn(source, 'courseIds')) patch.courseIds = sanitizeStringArray(source.courseIds, 120);
    if (hasOwn(source, 'testIds')) patch.testIds = sanitizeStringArray(source.testIds, 120);
    if (hasOwn(source, 'status')) patch.status = normalizeStatus(source.status);

    const previous = await TmsEnrollmentModel.findOne({ studentId }).lean();

    await TmsEnrollmentModel.updateOne(
      { studentId },
      {
        $set: {
          studentId,
          ...patch,
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    const updated = await TmsEnrollmentModel.findOne({ studentId }).lean();
    const previousBatchId = sanitizeText(previous?.batchId, 120) || null;
    const currentBatchId = sanitizeText(updated?.batchId, 120) || null;

    if (previousBatchId && previousBatchId !== currentBatchId) {
      await TmsBatchModel.updateOne({ _id: previousBatchId }, { $pull: { studentIds: studentId } });
    }
    if (currentBatchId) {
      await TmsBatchModel.updateOne({ _id: currentBatchId }, { $addToSet: { studentIds: studentId } });
    }

    return NextResponse.json(toEnrollment(updated || { studentId }));
  } catch (error) {
    console.error('[api/enrollments] Failed to update enrollment:', error);
    return NextResponse.json({ message: 'Failed to update enrollment' }, { status: 500 });
  }
}
