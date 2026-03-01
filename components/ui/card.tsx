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
        'rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-card backdrop-blur',
        className
      )}
    >
      {children}
    </div>
  );
}
