import { Student } from '@/types';
import { apiRequest } from './api-client';

export async function getStudents() {
  return apiRequest<Student[]>('/api/students');
}

export async function getStudentById(studentId: string) {
  return apiRequest<Student | null>(`/api/students?id=${encodeURIComponent(studentId)}`);
}

export async function getStudentByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return null;
  return apiRequest<Student | null>(`/api/students?email=${encodeURIComponent(normalizedEmail)}`);
}

export async function updateStudent(studentId: string, payload: Partial<Student>) {
  return apiRequest<Student>('/api/students', {
    method: 'PUT',
    body: { id: studentId, patch: payload },
  });
}

