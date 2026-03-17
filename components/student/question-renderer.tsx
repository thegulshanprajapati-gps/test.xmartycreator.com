'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, ChevronLeft, ChevronRight, Flag, Lightbulb, Sparkles } from 'lucide-react';
import { Question } from '@/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/helpers';

type ThemeMode = 'light' | 'dark';

type Props = {
  question: Question;
  selected: string | null;
  isMarked: boolean;
  questionNumber: number;
  totalQuestions: number;
  onSelect: (value: string) => void;
  onClear: () => void;
  onToggleMark: () => void;
  onPrev: () => void;
  onNext: () => void;
  onHint: () => void;
  disablePrev?: boolean;
  disableNext?: boolean;
  theme?: ThemeMode;
};

export function QuestionRenderer({
  question,
  selected,
  isMarked,
  questionNumber,
  totalQuestions,
  onSelect,
  onClear,
  onToggleMark,
  onPrev,
  onNext,
  onHint,
  disablePrev = false,
  disableNext = false,
  theme = 'light',
}: Props) {
  const dark = theme === 'dark';

  return (
    <div
      className={cn(
        'rounded-3xl border p-5 shadow-card transition-colors',
        dark ? 'border-slate-700 bg-[#1E293B]/85 text-[#E2E8F0]' : 'border-[#E5E7EB] bg-white text-[#111827]'
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={cn('text-xs font-semibold uppercase tracking-[0.18em]', dark ? 'text-indigo-300' : 'text-indigo-600')}>
            Question {questionNumber} of {totalQuestions}
          </p>
          <h2 className={cn('mt-2 text-lg font-bold leading-relaxed', dark ? 'text-slate-100' : 'text-slate-900')}>
            {question.text}
          </h2>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className={cn('rounded-full border px-2.5 py-1', dark ? 'border-indigo-400/40 bg-indigo-500/20 text-indigo-200' : 'border-indigo-200 bg-indigo-50 text-indigo-700')}>
            Computer Fundamentals
          </span>
          <span className={cn('rounded-full border px-2.5 py-1', dark ? 'border-slate-600 bg-slate-800 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-700')}>
            {question.difficulty}
          </span>
        </div>
      </div>

      {question.description ? (
        <p
          className={cn(
            'mt-3 rounded-2xl border px-3 py-2 text-sm',
            dark ? 'border-slate-700 bg-slate-800/80 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-600'
          )}
        >
          {question.description}
        </p>
      ) : null}

      <div className="mt-5 grid gap-3">
        {question.type === 'MCQ' ? (
          question.options.map((option, index) => {
            const isSelected = selected === option;
            return (
              <motion.button
                key={`${option}-${index}`}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.99 }}
                transition={{ duration: 0.16 }}
                className={cn(
                  'group flex items-start gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition',
                  dark
                    ? isSelected
                      ? 'border-indigo-400 bg-indigo-500/25 text-indigo-100 shadow-[0_0_22px_rgba(99,102,241,0.28)]'
                      : 'border-slate-700 bg-slate-800/70 text-slate-200 hover:border-indigo-400/55'
                    : isSelected
                      ? 'border-indigo-400 bg-indigo-50 text-indigo-900 shadow-[0_10px_24px_-16px_rgba(99,102,241,0.35)]'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-slate-50'
                )}
                onClick={() => onSelect(option)}
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className={cn(
                      'mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                      dark
                        ? isSelected
                          ? 'bg-indigo-400 text-slate-900'
                          : 'bg-slate-700 text-slate-200 group-hover:bg-indigo-500/30'
                        : isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600 group-hover:bg-indigo-100'
                    )}
                  >
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="leading-6">{option}</span>
                </div>
                <span
                  className={cn(
                    'ml-auto mt-0.5 shrink-0 rounded-full p-1 transition-opacity',
                    isSelected
                      ? dark
                        ? 'bg-emerald-500/20 text-emerald-300 opacity-100'
                        : 'bg-emerald-100 text-emerald-600 opacity-100'
                      : 'opacity-0'
                  )}
                >
                  <CheckCircle2 size={14} />
                </span>
              </motion.button>
            );
          })
        ) : (
          <input
            value={selected ?? ''}
            onChange={(event) => onSelect(event.target.value)}
            placeholder="Enter numeric answer"
            className={cn(
              'h-12 rounded-2xl border px-3 text-sm outline-none transition',
              dark
                ? 'border-slate-700 bg-slate-800 text-slate-100 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30'
                : 'border-slate-200 bg-white text-slate-700 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100'
            )}
            inputMode="decimal"
          />
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t pt-4">
        <Button variant="outline" onClick={onPrev} disabled={disablePrev} className="gap-1.5">
          <ChevronLeft size={15} />
          Previous
        </Button>
        <Button onClick={onNext} disabled={disableNext} className="gap-1.5">
          Next
          <ChevronRight size={15} />
        </Button>
        <Button variant={isMarked ? 'secondary' : 'outline'} onClick={onToggleMark} className="gap-1.5">
          <Flag size={14} />
          {isMarked ? 'Marked for Review' : 'Mark for Review'}
        </Button>
        <Button variant="secondary" onClick={onHint} className="gap-1">
          <Lightbulb size={14} />
          AI Hint
        </Button>
        <button
          onClick={onClear}
          className={cn(
            'ml-auto rounded-xl px-3 py-1.5 text-xs font-semibold transition',
            dark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'
          )}
        >
          Clear Response
        </button>
      </div>

      <div className={cn('mt-4 flex flex-wrap items-center gap-2 text-[11px]', dark ? 'text-slate-400' : 'text-slate-500')}>
        <span className="inline-flex items-center gap-1 rounded-full border border-current/20 px-2 py-1">
          <Sparkles size={12} />
          Shortcuts
        </span>
        <kbd className="rounded border border-current/30 px-1.5 py-0.5 font-mono">1-4</kbd>
        <span>Select Option</span>
        <kbd className="rounded border border-current/30 px-1.5 py-0.5 font-mono">P</kbd>
        <span>Previous</span>
        <kbd className="rounded border border-current/30 px-1.5 py-0.5 font-mono">N</kbd>
        <span>Next</span>
        <kbd className="rounded border border-current/30 px-1.5 py-0.5 font-mono">M</kbd>
        <span>Mark</span>
        <kbd className="rounded border border-current/30 px-1.5 py-0.5 font-mono">H</kbd>
        <span>AI Hint</span>
      </div>
    </div>
  );
}
