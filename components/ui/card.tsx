import { cn } from '@/utils/helpers';

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-white/90 p-5 shadow-card backdrop-blur dark:bg-slate-900/75',
        className
      )}
    >
      {children}
    </div>
  );
}
