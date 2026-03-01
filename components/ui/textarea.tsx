'use client';

import { TextareaHTMLAttributes } from 'react';
import { cn } from '@/utils/helpers';

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100',
        className
      )}
      {...props}
    />
  );
}
