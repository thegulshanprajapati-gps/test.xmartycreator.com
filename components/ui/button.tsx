'use client';

import { ButtonHTMLAttributes } from 'react';
import { cn } from '@/utils/helpers';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';

const styles: Record<Variant, string> = {
  primary:
    'bg-primary text-primary-foreground hover:bg-blue-500 shadow-glass',
  secondary:
    'bg-secondary text-secondary-foreground hover:bg-cyan-500 shadow-glass',
  ghost: 'bg-transparent text-foreground hover:bg-slate-100',
  danger: 'bg-danger text-white hover:bg-red-500',
  outline: 'border border-slate-300 bg-white text-foreground hover:bg-slate-50',
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
