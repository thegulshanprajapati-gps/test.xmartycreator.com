import { Test } from '@/types';
import { apiRequest } from './api-client';

export type TestFilter = {
  status?: string;
  batchId?: string;
  courseId?: string;
  paid?: 'all' | 'free' | 'paid';
  query?: string;
};

export async function getTests(filter?: TestFilter) {
  const searchParams = new URLSearchParams();
  if (filter?.status) searchParams.set('status', filter.status);
  if (filter?.batchId) searchParams.set('batchId', filter.batchId);
  if (filter?.courseId) searchParams.set('courseId', filter.courseId);
  if (filter?.paid) searchParams.set('paid', filter.paid);
  if (filter?.query) searchParams.set('query', filter.query);
  const query = searchParams.toString();
  return apiRequest<Test[]>(query ? `/api/tests?${query}` : '/api/tests');
}

export async function getTestById(id: string) {
  return apiRequest<Test | null>(`/api/tests?id=${encodeURIComponent(id)}`);
}

export async function createTest(payload: Omit<Test, 'id' | 'attemptsCount'>) {
  return apiRequest<Test>('/api/tests', {
    method: 'POST',
    body: payload,
  });
}

export async function updateTest(id: string, patch: Partial<Test>) {
  return apiRequest<Test>('/api/tests', {
    method: 'PUT',
    body: { id, patch },
  });
}

export async function duplicateTest(id: string) {
  const existing = await getTestById(id);
  if (!existing) throw new Error('Test not found');

  const { id: _id, attemptsCount: _attemptsCount, ...rest } = existing;
  return createTest({
    ...rest,
    name: `${existing.name} (Copy)`,
    status: 'Draft',
    isLocked: false,
  });
}

export async function togglePublish(id: string) {
  const existing = await getTestById(id);
  if (!existing) throw new Error('Test not found');
  const nextStatus = existing.status === 'Published' ? 'Draft' : 'Published';
  return updateTest(id, { status: nextStatus });
}

export async function toggleLock(id: string) {
  const existing = await getTestById(id);
  if (!existing) throw new Error('Test not found');
  return updateTest(id, { isLocked: !existing.isLocked });
}

