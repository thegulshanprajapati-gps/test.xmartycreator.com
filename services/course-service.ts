import { Course } from '@/types';
import { apiRequest } from './api-client';

export async function getCourses() {
  return apiRequest<Course[]>('/api/courses');
}

export async function getCourseById(courseId: string) {
  const id = encodeURIComponent(courseId);
  return apiRequest<Course | null>(`/api/courses?id=${id}`);
}

export async function createCourse(payload: Pick<Course, 'name' | 'description' | 'validityDays' | 'price'>) {
  return apiRequest<Course>('/api/courses', {
    method: 'POST',
    body: payload,
  });
}

export async function updateCourse(courseId: string, patch: Partial<Course>) {
  return apiRequest<Course>('/api/courses', {
    method: 'PUT',
    body: { id: courseId, patch },
  });
}

