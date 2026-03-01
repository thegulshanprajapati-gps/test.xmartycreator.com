'use client';

import { AttemptQuestionState } from '@/store/test-attempt-store';
import { cn } from '@/utils/helpers';

type Props = {
  questionIds: string[];
  activeIndex: number;
  getState: (questionId: string) => AttemptQuestionState;
  onChange: (index: number) => void;
};

const colorMap: Record<AttemptQuestionState, string> = {
  not_visited: 'bg-slate-100 text-slate-500',
  answered: 'bg-emerald-100 text-emerald-700',
  not_answered: 'bg-amber-100 text-amber-700',
  marked_for_review: 'bg-purple-100 text-purple-700',
};

export function TestPalette({ questionIds, activeIndex, getState, onChange }: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Question Palette
      </p>
      <div className="grid grid-cols-5 gap-2">
        {questionIds.map((id, index) => {
          const state = getState(id);
          return (
            <button
              key={id}
              onClick={() => onChange(index)}
              className={cn(
                'rounded-lg border px-2 py-1.5 text-xs font-semibold transition',
                colorMap[state],
                index === activeIndex ? 'border-slate-900 ring-2 ring-slate-300' : 'border-transparent'
              )}
            >
              {index + 1}
            </button>
          );
        })}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-600">Not visited</span>
        <span className="rounded-md bg-emerald-100 px-2 py-1 text-emerald-700">Answered</span>
        <span className="rounded-md bg-amber-100 px-2 py-1 text-amber-700">Not answered</span>
        <span className="rounded-md bg-purple-100 px-2 py-1 text-purple-700">Marked</span>
      </div>
    </div>
  );
}
