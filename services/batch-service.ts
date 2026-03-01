import { Batch } from '@/types';
import { apiRequest } from './api-client';

export async function getBatches() {
  return apiRequest<Batch[]>('/api/batches');
}

export async function getBatchById(batchId: string) {
  return apiRequest<Batch | null>(`/api/batches?id=${encodeURIComponent(batchId)}`);
}

export async function createBatch(payload: Pick<Batch, 'name' | 'startAt' | 'endAt'>) {
  return apiRequest<Batch>('/api/batches', {
    method: 'POST',
    body: payload,
  });
}

export async function updateBatch(batchId: string, patch: Partial<Batch>) {
  return apiRequest<Batch>('/api/batches', {
    method: 'PUT',
    body: { id: batchId, patch },
  });
}

