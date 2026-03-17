'use client';

import { cn } from '@/utils/helpers';

type ThemeMode = 'light' | 'dark';

function formatClock(seconds: number) {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function TestTimer({
  seconds,
  totalSeconds,
  theme = 'light',
}: {
  seconds: number;
  totalSeconds?: number;
  theme?: ThemeMode;
}) {
  const dark = theme === 'dark';
  const total = Math.max(totalSeconds ?? seconds, 1);
  const pct = Math.max(0, Math.min(100, (seconds / total) * 100));
  const isCritical = seconds <= 120;
  const isWarning = !isCritical && seconds <= 300;

  const ringColor = isCritical ? '#ef4444' : isWarning ? '#f59e0b' : '#6366F1';
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (pct / 100) * circumference;

  return (
    <div
      className={cn(
        'relative flex h-28 w-28 items-center justify-center rounded-full border transition-colors',
        dark
          ? 'border-slate-700 bg-slate-800/80 shadow-[0_0_28px_rgba(99,102,241,0.22)]'
          : 'border-slate-200 bg-white/70 shadow-card'
      )}
    >
      {isCritical ? (
        <span className="pointer-events-none absolute inset-0 rounded-full border border-red-400/40 animate-ping" />
      ) : null}
      <svg className="-rotate-90 h-24 w-24" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke={dark ? 'rgba(148,163,184,0.26)' : 'rgba(148,163,184,0.32)'}
          strokeWidth="8"
          fill="none"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke={ringColor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          fill="none"
          className="transition-all duration-500"
        />
      </svg>

      <div className="absolute text-center">
        <p
          className={cn(
            'text-sm font-bold tracking-wide',
            dark ? 'text-slate-100' : 'text-slate-800'
          )}
        >
          {formatClock(seconds)}
        </p>
        <p className={cn('text-[10px] uppercase tracking-[0.15em]', dark ? 'text-slate-400' : 'text-slate-500')}>
          Left
        </p>
        <p
          className={cn(
            'mt-0.5 text-[9px] font-semibold uppercase tracking-[0.14em]',
            isCritical
              ? 'text-red-500'
              : isWarning
                ? 'text-amber-500'
                : dark
                  ? 'text-emerald-300'
                  : 'text-emerald-600'
          )}
        >
          {isCritical ? 'Critical' : isWarning ? 'Hurry Up' : 'On Track'}
        </p>
      </div>
    </div>
  );
}
