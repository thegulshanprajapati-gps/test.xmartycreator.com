import { AccessCheck, Attempt, Student, Test } from '@/types';

function attemptsUsed(attempts: Attempt[], testId: string, studentId: string) {
  return attempts.filter(
    (attempt) =>
      attempt.testId === testId &&
      attempt.studentId === studentId &&
      attempt.status !== 'in_progress'
  ).length;
}

export function checkTestAccess(params: {
  test: Test;
  student: Student;
  attempts: Attempt[];
  now?: Date;
}): AccessCheck {
  const now = params.now ?? new Date();
  const { test, student, attempts } = params;
  const hasBatchAccess =
    student.batchId !== null && test.allowedBatchIds.includes(student.batchId);
  const hasCourseAccess = student.courseIds.some((courseId) =>
    test.allowedCourseIds.includes(courseId)
  );
  const hasDirectTestEnrollment = (student.enrolledTestIds || []).includes(test.id);

  if (test.status !== 'Published') {
    return {
      allowed: false,
      reason: 'NOT_PUBLISHED',
      message: 'This test is not published yet.',
    };
  }

  if (test.isLocked) {
    return {
      allowed: false,
      reason: 'TEST_LOCKED',
      message: 'This test is currently locked by admin.',
    };
  }

  if (!hasBatchAccess && !hasCourseAccess && !hasDirectTestEnrollment) {
    return {
      allowed: false,
      reason: 'NOT_ASSIGNED',
      message: 'This test is not assigned to your batch/course or enrolled test list.',
    };
  }

  if (test.startAt && new Date(test.startAt).getTime() > now.getTime()) {
    return {
      allowed: false,
      reason: 'WINDOW_NOT_STARTED',
      message: 'Test window has not started yet.',
    };
  }

  if (test.endAt && new Date(test.endAt).getTime() < now.getTime()) {
    return {
      allowed: false,
      reason: 'WINDOW_EXPIRED',
      message: 'Test window has expired.',
    };
  }

  if (test.attemptLimit !== 'unlimited') {
    const used = attemptsUsed(attempts, test.id, student.id);
    if (used >= test.attemptLimit) {
      return {
        allowed: false,
        reason: 'ATTEMPTS_EXCEEDED',
        message: `Attempt limit reached (${test.attemptLimit}/${test.attemptLimit}).`,
      };
    }
  }

  return {
    allowed: true,
    reason: 'OK',
    message: 'Authorized',
  };
}
