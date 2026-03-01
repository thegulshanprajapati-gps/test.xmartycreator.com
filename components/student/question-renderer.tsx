'use client';

import { Question } from '@/types';
import { Button } from '@/components/ui/button';

type Props = {
  question: Question;
  selected: string | null;
  isMarked: boolean;
  onSelect: (value: string) => void;
  onClear: () => void;
  onToggleMark: () => void;
  onPrev: () => void;
  onNext: () => void;
};

export function QuestionRenderer({
  question,
  selected,
  isMarked,
  onSelect,
  onClear,
  onToggleMark,
  onPrev,
  onNext,
}: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-600">{question.topic}</p>
      <h2 className="mt-1 text-base font-semibold text-slate-900">{question.text}</h2>
      {question.description ? (
        <p className="mt-2 text-sm text-slate-600">{question.description}</p>
      ) : null}

      <div className="mt-4 grid gap-2">
        {question.type === 'MCQ' ? (
          question.options.map((option, index) => (
            <button
              key={`${option}-${index}`}
              className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                selected === option
                  ? 'border-blue-400 bg-blue-50 text-blue-700'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
              onClick={() => onSelect(option)}
            >
              {String.fromCharCode(65 + index)}. {option}
            </button>
          ))
        ) : (
          <input
            value={selected ?? ''}
            onChange={(event) => onSelect(event.target.value)}
            placeholder="Enter numeric answer"
            className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" onClick={onClear}>
          Clear Response
        </Button>
        <Button variant={isMarked ? 'secondary' : 'outline'} onClick={onToggleMark}>
          {isMarked ? 'Marked for Review' : 'Mark for Review'}
        </Button>
      </div>

      <div className="mt-5 flex justify-between gap-2">
        <Button variant="outline" onClick={onPrev}>
          Previous
        </Button>
        <Button onClick={onNext}>Save & Next</Button>
      </div>
    </div>
  );
}
