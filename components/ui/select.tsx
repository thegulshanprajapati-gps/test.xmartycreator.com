'use client';

import { SelectHTMLAttributes } from 'react';
import { cn } from '@/utils/helpers';

type Option = {
  label: string;
  value: string;
};

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  options: Option[];
};

export function Select({ className, options, ...props }: Props) {
  return (
    <select
      className={cn(
        'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-indigo-400 dark:focus:ring-indigo-500/20',
        className
      )}
      {...props}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
