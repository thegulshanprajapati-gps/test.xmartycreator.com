'use client';

import { ButtonHTMLAttributes } from 'react';
import { cn } from '@/utils/helpers';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';

const styles: Record<Variant, string> = {
  primary:
    'bg-primary text-primary-foreground hover:bg-indigo-500 shadow-glass dark:hover:bg-indigo-400',
  secondary:
    'bg-secondary text-secondary-foreground hover:bg-cyan-500 shadow-glass dark:hover:bg-cyan-400',
  ghost: 'bg-transparent text-foreground hover:bg-slate-100 dark:hover:bg-slate-800',
  danger: 'bg-danger text-white hover:bg-red-500 dark:hover:bg-red-400',
  outline:
    'border border-border bg-white text-foreground hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800',
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

export function Button({
  variant = 'primary',
  className,
  type = 'button',
  ...props
}: Props) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60',
        styles[variant],
        className
      )}
      {...props}
    />
  );
}
