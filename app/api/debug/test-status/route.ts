import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthUser } from '@/lib/auth';
import { connectMongo } from '@/lib/mongo';
import { TmsAttemptModel, TmsEnrollmentModel, TmsStudentModel, TmsTestModel } from '@/lib/models/tms';
import { checkTestAccess } from '@/lib/access-control';
import { Test, Student, Attempt } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const sanitizeId = (value: unknown) => {
  if (typeof value === 'string') return value.trim().slice(0, 120);
  if (typeof value === 'number') return String(value).slice(0, 120);
  return '';
};

const toIsoString = (date: any): string | null => {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
};

export async function POST(request: NextRequest) {
  try {
    const user = await getServerAuthUser();
    if (!user || user.role !== 'STUDENT' || !user.studentId) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Student login required' },
        { status: 401 }
      );
    }

    const body = (await request.json()) as { testId?: string };
    const testId = sanitizeId(body?.testId);

    if (!testId) {
      return NextResponse.json(
        { error: 'INVALID_REQUEST', message: 'testId is required' },
        { status: 400 }
      );
    }

    await connectMongo();

    // Fetch test data
    const testDoc = await TmsTestModel.findById(testId).lean();
    if (!testDoc) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Test not found' },
        { status: 404 }
      );
    }

    // Fetch student
    const studentEmail = user.studentId.toLowerCase();
    const studentDoc = await TmsStudentModel.findOne({ email: studentEmail }).lean();
    const enrollmentDoc = await TmsEnrollmentModel.findOne({ studentId: studentEmail }).lean();

    // Fetch attempts
    const attemptDocs = await TmsAttemptModel.find({ testId, studentId: studentEmail }).lean();

    // Build student object
    const student: Student = {
      id: studentEmail,
      name: studentDoc?.name || studentEmail.split('@')[0] || 'Student',
      email: studentEmail,
      mobile: studentDoc?.mobile || '',
      batchId: enrollmentDoc?.batchId || null,
      courseIds: enrollmentDoc?.courseIds || [],
      enrolledTestIds: enrollmentDoc?.testIds || [],
      status: studentDoc?.status || 'active',
    };

    // Build test object
    const test: Test = {
      id: String(testDoc._id),
      name: testDoc.name || '',
      category: testDoc.category || '',
      status: testDoc.status || 'Draft',
      durationMin: testDoc.durationMin || 60,
      totalMarks: testDoc.totalMarks || 100,
      marksPerQuestion: testDoc.marksPerQuestion || 1,
      negativeMarking: Boolean(testDoc.negativeMarking),
      negativeMarksValue: testDoc.negativeMarksValue || 0,
      sections: testDoc.sections || [],
      startAt: toIsoString(testDoc.startAt),
      endAt: toIsoString(testDoc.endAt),
      attemptLimit: testDoc.attemptLimit || 1,
      shuffleQuestions: Boolean(testDoc.shuffleQuestions),
      shuffleOptions: Boolean(testDoc.shuffleOptions),
      instructions: testDoc.instructions || '',
      allowedBatchIds: testDoc.allowedBatchIds || [],
      allowedCourseIds: testDoc.allowedCourseIds || [],
      isPaid: Boolean(testDoc.isPaid),
      price: testDoc.price || 0,
      isLocked: Boolean(testDoc.isLocked),
      attemptsCount: testDoc.attemptsCount || 0,
      questionIds: testDoc.questionIds || [],
    };

    // Build attempts object
    const attempts: Attempt[] = attemptDocs.map((doc) => ({
      id: String(doc._id),
      testId: doc.testId,
      studentId: doc.studentId,
      startedAt: toIsoString(doc.startedAt) || new Date().toISOString(),
      submittedAt: toIsoString(doc.submittedAt),
      timeTakenSec: doc.timeTakenSec || 0,
      answers: doc.answers || [],
      score: doc.score || 0,
      accuracy: doc.accuracy || 0,
      status: doc.status || 'submitted',
    }));

    // Check access
    const access = checkTestAccess({ 
      test,
      student,
      attempts,
    });

    return NextResponse.json({
      ok: true,
      access: {
        allowed: access.allowed,
        reason: access.reason,
        message: access.message,
      },
      debug: {
        studentInfo: {
          id: student.id,
          name: student.name,
          batchId: student.batchId,
          enrolledTestIds: student.enrolledTestIds,
          courseIds: student.courseIds,
        },
        testInfo: {
          id: test.id,
          name: test.name,
          status: test.status,
          isLocked: test.isLocked,
          startAt: test.startAt,
          endAt: test.endAt,
          questionCount: test.questionIds.length,
          sectionCount: test.sections.length,
        },
        enrollmentCheck: {
          hasBatchAccess: student.batchId !== null && test.allowedBatchIds.includes(student.batchId),
          hasCourseAccess: student.courseIds.some((cid) => test.allowedCourseIds.includes(cid)),
          hasDirectEnrollment: student.enrolledTestIds.includes(test.id),
        },
        attemptsInfo: {
          totalAttempts: attempts.length,
          completedAttempts: attempts.filter((a) => a.status !== 'in_progress').length,
          attemptLimit: test.attemptLimit,
        },
        now: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[api/debug/test-status]', error);
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: String(error) },
      { status: 500 }
    );
  }
}
