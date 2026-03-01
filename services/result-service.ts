import { Answer, Attempt, Question } from '@/types';
import { apiRequest } from './api-client';

export async function getAttempts() {
  return apiRequest<Attempt[]>('/api/attempts');
}

export async function getAttemptById(id: string) {
  return apiRequest<Attempt | null>(`/api/attempts?id=${encodeURIComponent(id)}`);
}

export async function getAttemptsByTest(testId: string) {
  return apiRequest<Attempt[]>(`/api/attempts?testId=${encodeURIComponent(testId)}`);
}

export async function getAttemptsByStudent(studentId: string) {
  return apiRequest<Attempt[]>(
    `/api/attempts?studentId=${encodeURIComponent(studentId.trim().toLowerCase())}`
  );
}

export async function submitAttempt(params: {
  testId: string;
  studentId: string;
  startedAt: string;
  answers: Answer[];
  timeTakenSec: number;
  autoSubmitted?: boolean;
}) {
  return apiRequest<Attempt>('/api/attempts', {
    method: 'POST',
    body: params,
  });
}

export function buildTopicAccuracy(params: { answers: Answer[]; questionPool: Question[] }) {
  const byTopic = new Map<string, { correct: number; total: number }>();
  const questionMap = new Map(params.questionPool.map((question) => [question.id, question]));

  params.answers.forEach((answer) => {
    const question = questionMap.get(answer.questionId);
    if (!question) return;
    const item = byTopic.get(question.topic) ?? { correct: 0, total: 0 };
    if (answer.selected) {
      item.total += 1;
      if (String(answer.selected).trim() === String(question.correctAnswer).trim()) {
        item.correct += 1;
      }
    }
    byTopic.set(question.topic, item);
  });

  return Array.from(byTopic.entries()).map(([topic, values]) => ({
    topic,
    accuracy: values.total > 0 ? Number(((values.correct / values.total) * 100).toFixed(1)) : 0,
  }));
}

