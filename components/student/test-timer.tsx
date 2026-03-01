'use client';

import { formatDuration } from '@/utils/formatters';

export function TestTimer({ seconds }: { seconds: number }) {
  const isCritical = seconds < 120;
  return (
    <div
      className={`rounded-xl px-3 py-1.5 text-sm font-semibold ${
        isCritical
          ? 'bg-red-100 text-red-700'
          : 'bg-blue-100 text-blue-700'
      }`}
    >
      Time Left: {formatDuration(seconds)}
    </div>
  );
}
