import { Question } from '@/types';
import { apiRequest } from './api-client';

export async function getQuestions() {
  return apiRequest<Question[]>('/api/questions');
}

export async function createQuestion(payload: Omit<Question, 'id'>) {
  return apiRequest<Question>('/api/questions', {
    method: 'POST',
    body: payload,
  });
}

