'use client';

import { X } from 'lucide-react';
import { cn } from '@/utils/helpers';

type Option = {
  label: string;
  value: string;
};

type Props = {
  options: Option[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
};

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Select options',
}: Props) {
  const selected = options.filter((item) => value.includes(item.value));
  const available = options.filter((item) => !value.includes(item.value));

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-2 flex min-h-10 flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-2 dark:bg-slate-800">
        {selected.length === 0 ? (
          <span className="text-sm text-slate-400 dark:text-slate-500">{placeholder}</span>
        ) : (
          selected.map((item) => (
            <span
              key={item.value}
              className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-indigo-500/20 dark:text-indigo-200"
            >
              {item.label}
              <button
                onClick={() =>
                  onChange(value.filter((entry) => entry !== item.value))
                }
              >
                <X size={12} />
              </button>
            </span>
          ))
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {available.map((item) => (
          <button
            key={item.value}
            className={cn(
              'rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:text-slate-200 dark:hover:border-indigo-400 dark:hover:text-indigo-300'
            )}
            onClick={() => onChange([...value, item.value])}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
