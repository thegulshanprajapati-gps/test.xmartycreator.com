import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Answer } from '@/types';

export type AttemptQuestionState =
  | 'not_visited'
  | 'answered'
  | 'not_answered'
  | 'marked_for_review';

type ActiveAttempt = {
  testId: string;
  studentId: string;
  startedAt: string;
  remainingSec: number;
  currentQuestionIndex: number;
  questionIds: string[];
  answers: Answer[];
  visitedQuestionIds: string[];
};

type AttemptStore = {
  activeAttempt: ActiveAttempt | null;
  startAttempt: (payload: {
    testId: string;
    studentId: string;
    durationMin: number;
    questionIds: string[];
  }) => void;
  setCurrentQuestion: (index: number) => void;
  setAnswer: (questionId: string, selected: string | null, deltaSec?: number) => void;
  clearAnswer: (questionId: string) => void;
  toggleMark: (questionId: string) => void;
  saveAndNext: () => void;
  previous: () => void;
  tick: () => void;
  reset: () => void;
  getQuestionState: (questionId: string) => AttemptQuestionState;
};

function upsertAnswer(
  list: Answer[],
  questionId: string,
  patch: Partial<Answer>
): Answer[] {
  const existing = list.find((answer) => answer.questionId === questionId);
  if (existing) {
    return list.map((answer) =>
      answer.questionId === questionId ? { ...answer, ...patch } : answer
    );
  }
  return [
    ...list,
    {
      questionId,
      selected: null,
      isMarked: false,
      timeSpentSec: 0,
      ...patch,
    },
  ];
}

export const useTestAttemptStore = create<AttemptStore>()(
  persist(
    (set, get) => ({
      activeAttempt: null,
      startAttempt: ({ testId, studentId, durationMin, questionIds }) => {
        set({
          activeAttempt: {
            testId,
            studentId,
            startedAt: new Date().toISOString(),
            remainingSec: durationMin * 60,
            currentQuestionIndex: 0,
            questionIds,
            answers: questionIds.map((questionId) => ({
              questionId,
              selected: null,
              isMarked: false,
              timeSpentSec: 0,
            })),
            visitedQuestionIds: [questionIds[0]].filter(Boolean),
          },
        });
      },
      setCurrentQuestion: (index) => {
        const current = get().activeAttempt;
        if (!current) return;
        const bounded = Math.max(0, Math.min(index, current.questionIds.length - 1));
        const questionId = current.questionIds[bounded];
        set({
          activeAttempt: {
            ...current,
            currentQuestionIndex: bounded,
            visitedQuestionIds: Array.from(
              new Set([...current.visitedQuestionIds, questionId])
            ),
          },
        });
      },
      setAnswer: (questionId, selected, deltaSec = 0) => {
        const current = get().activeAttempt;
        if (!current) return;
        set({
          activeAttempt: {
            ...current,
            answers: upsertAnswer(current.answers, questionId, {
              selected,
              timeSpentSec:
                (current.answers.find((answer) => answer.questionId === questionId)
                  ?.timeSpentSec ?? 0) + deltaSec,
            }),
          },
        });
      },
      clearAnswer: (questionId) => {
        const current = get().activeAttempt;
        if (!current) return;
        set({
          activeAttempt: {
            ...current,
            answers: upsertAnswer(current.answers, questionId, { selected: null }),
          },
        });
      },
      toggleMark: (questionId) => {
        const current = get().activeAttempt;
        if (!current) return;
        const answer = current.answers.find((item) => item.questionId === questionId);
        set({
          activeAttempt: {
            ...current,
            answers: upsertAnswer(current.answers, questionId, {
              isMarked: !answer?.isMarked,
            }),
          },
        });
      },
      saveAndNext: () => {
        const current = get().activeAttempt;
        if (!current) return;
        const nextIndex = Math.min(
          current.currentQuestionIndex + 1,
          current.questionIds.length - 1
        );
        const questionId = current.questionIds[nextIndex];
        set({
          activeAttempt: {
            ...current,
            currentQuestionIndex: nextIndex,
            visitedQuestionIds: Array.from(
              new Set([...current.visitedQuestionIds, questionId])
            ),
          },
        });
      },
      previous: () => {
        const current = get().activeAttempt;
        if (!current) return;
        set({
          activeAttempt: {
            ...current,
            currentQuestionIndex: Math.max(0, current.currentQuestionIndex - 1),
          },
        });
      },
      tick: () => {
        const current = get().activeAttempt;
        if (!current) return;
        set({
          activeAttempt: {
            ...current,
            remainingSec: Math.max(0, current.remainingSec - 1),
          },
        });
      },
      reset: () => set({ activeAttempt: null }),
      getQuestionState: (questionId) => {
        const current = get().activeAttempt;
        if (!current) return 'not_visited';
        const visited = current.visitedQuestionIds.includes(questionId);
        const answer = current.answers.find((item) => item.questionId === questionId);
        if (!visited) return 'not_visited';
        if (answer?.isMarked) return 'marked_for_review';
        if (answer?.selected) return 'answered';
        return 'not_answered';
      },
    }),
    {
      name: 'tms-attempt-store',
      partialize: (state) => ({ activeAttempt: state.activeAttempt }),
    }
  )
);
