'use client';

import { AttemptQuestionState } from '@/store/test-attempt-store';
import { cn } from '@/utils/helpers';

type ThemeMode = 'light' | 'dark';

type Props = {
  questionIds: string[];
  activeIndex: number;
  getState: (questionId: string) => AttemptQuestionState;
  onChange: (index: number) => void;
  onExit: () => void;
  theme?: ThemeMode;
};

const stateStylesLight: Record<AttemptQuestionState, string> = {
  not_visited: 'border-slate-200 bg-slate-100 text-slate-600',
  answered: 'border-emerald-200 bg-emerald-100 text-emerald-800',
  not_answered: 'border-amber-200 bg-amber-100 text-amber-800',
  marked_for_review: 'border-violet-200 bg-violet-100 text-violet-800',
};

const stateStylesDark: Record<AttemptQuestionState, string> = {
  not_visited: 'border-slate-700 bg-slate-800 text-slate-300',
  answered: 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300',
  not_answered: 'border-amber-500/40 bg-amber-500/20 text-amber-300',
  marked_for_review: 'border-indigo-500/50 bg-indigo-500/25 text-indigo-200',
};

export function TestPalette({
  questionIds,
  activeIndex,
  getState,
  onChange,
  onExit,
  theme = 'light',
}: Props) {
  const dark = theme === 'dark';
  const counts = questionIds.reduce(
    (acc, id) => {
      const state = getState(id);
      acc[state] += 1;
      return acc;
    },
    {
      not_visited: 0,
      answered: 0,
      not_answered: 0,
      marked_for_review: 0,
    }
  );
  const total = questionIds.length;
  const answeredPct = total ? Math.round((counts.answered / total) * 100) : 0;
  const states = dark ? stateStylesDark : stateStylesLight;

  return (
    <aside
      className={cn(
        'rounded-3xl border p-4 shadow-card lg:sticky lg:top-24',
        dark ? 'border-slate-700 bg-[#1E293B]/85' : 'border-[#E5E7EB] bg-white'
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className={cn('text-xs font-semibold uppercase tracking-[0.18em]', dark ? 'text-slate-400' : 'text-slate-500')}>
          Question Palette
        </p>
        <span
          className={cn(
            'rounded-full px-2 py-1 text-xs font-semibold',
            dark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
          )}
        >
          {activeIndex + 1}/{total}
        </span>
      </div>

      <div className="mb-4 flex items-center justify-center">
        <div
          className="relative h-28 w-28 rounded-full shadow-[0_0_28px_rgba(34,197,94,0.16)]"
          style={{
            background: `conic-gradient(#22C55E ${answeredPct * 3.6}deg, ${
              dark ? 'rgba(148,163,184,0.25)' : 'rgba(148,163,184,0.28)'
            } 0deg)`,
          }}
        >
          <div
            className={cn(
              'absolute inset-[9px] grid place-items-center rounded-full border',
              dark ? 'border-slate-700 bg-[#0F172A] text-slate-100' : 'border-slate-200 bg-white text-slate-800'
            )}
          >
            <p className="text-lg font-bold">{counts.answered}/{total}</p>
            <p className={cn('text-[10px] uppercase tracking-[0.16em]', dark ? 'text-slate-400' : 'text-slate-500')}>
              Questions
            </p>
          </div>
        </div>
      </div>

      <p className={cn('mb-3 text-center text-[11px] font-semibold uppercase tracking-[0.12em]', dark ? 'text-slate-400' : 'text-slate-500')}>
        Completion {answeredPct}%
      </p>

      <div className="mb-3 grid grid-cols-2 gap-2 text-xs font-semibold">
        <span className={cn('rounded-xl px-2.5 py-1.5', dark ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-50 text-emerald-700')}>
          Answered: {counts.answered}
        </span>
        <span className={cn('rounded-xl px-2.5 py-1.5', dark ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-50 text-amber-700')}>
          Not Answered: {counts.not_answered}
        </span>
        <span className={cn('rounded-xl px-2.5 py-1.5', dark ? 'bg-indigo-500/15 text-indigo-300' : 'bg-indigo-50 text-indigo-700')}>
          Marked: {counts.marked_for_review}
        </span>
        <span className={cn('rounded-xl px-2.5 py-1.5', dark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600')}>
          Not Visited: {counts.not_visited}
        </span>
      </div>

      <div className="grid max-h-[300px] grid-cols-5 gap-2 overflow-y-auto pr-1 sm:grid-cols-7 lg:grid-cols-5">
        {questionIds.map((id, index) => {
          const state = getState(id);
          const isActive = index === activeIndex;
          return (
            <button
              key={id}
              onClick={() => onChange(index)}
              className={cn(
                'rounded-xl border px-2 py-2 text-xs font-bold transition hover:-translate-y-0.5 hover:shadow-md',
                states[state],
                isActive
                  ? dark
                    ? 'ring-2 ring-indigo-400 ring-offset-1 ring-offset-slate-900'
                    : 'ring-2 ring-indigo-500 ring-offset-1'
                  : ''
              )}
            >
              {index + 1}
            </button>
          );
        })}
      </div>

      <button
        onClick={onExit}
        className={cn(
          'mt-4 w-full rounded-2xl border px-3 py-2 text-sm font-semibold transition',
          dark
            ? 'border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700'
            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
        )}
      >
        Exit Test
      </button>
    </aside>
  );
}
