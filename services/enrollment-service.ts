import { Enrollment } from '@/types';
import { apiRequest } from './api-client';

export async function getEnrollments() {
  return apiRequest<Enrollment[]>('/api/enrollments');
}

export async function getEnrollmentByStudent(studentId: string) {
  return apiRequest<Enrollment | null>(
    `/api/enrollments?studentId=${encodeURIComponent(studentId.trim().toLowerCase())}`
  );
}

export async function updateEnrollment(id: string, patch: Partial<Enrollment>) {
  return apiRequest<Enrollment>('/api/enrollments', {
    method: 'PUT',
    body: { id, patch },
  });
}

export async function enrollStudentInTest(studentId: string, testId: string) {
  const normalizedStudentId = studentId.trim().toLowerCase();
  const normalizedTestId = testId.trim();
  if (!normalizedStudentId || !normalizedTestId) {
    throw new Error('Student ID and test ID are required.');
  }

  const current = await getEnrollmentByStudent(normalizedStudentId);
  const nextTestIds = Array.from(
    new Set([...(current?.testIds || []), normalizedTestId])
  );

  return updateEnrollment(normalizedStudentId, {
    studentId: normalizedStudentId,
    status: current?.status || 'active',
    batchId: current?.batchId || null,
    courseIds: current?.courseIds || [],
    testIds: nextTestIds,
  });
}
