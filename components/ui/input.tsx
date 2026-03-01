'use client';

import { InputHTMLAttributes } from 'react';
import { cn } from '@/utils/helpers';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100',
        className
      )}
      {...props}
    />
  );
}
