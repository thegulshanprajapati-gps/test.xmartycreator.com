'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { useEffect } from 'react';
import { ToastItem, useToastStore } from '@/store/toast-store';

function ToastIcon({ kind }: { kind: ToastItem['kind'] }) {
  if (kind === 'success') return <CheckCircle2 size={16} className="text-emerald-600" />;
  if (kind === 'error') return <TriangleAlert size={16} className="text-red-600" />;
  return <Info size={16} className="text-blue-600" />;
}

export function ToastViewport() {
  const items = useToastStore((state) => state.items);
  const remove = useToastStore((state) => state.remove);

  useEffect(() => {
    const timers = items.map((item) =>
      window.setTimeout(() => remove(item.id), 2600)
    );
    return () => timers.forEach((timer) => clearTimeout(timer));
  }, [items, remove]);

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-2">
      <AnimatePresence>
        {items.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            className="pointer-events-auto rounded-xl border border-slate-200 bg-white p-3 shadow-card"
          >
            <div className="flex items-start gap-2">
              <ToastIcon kind={item.kind} />
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                {item.description ? (
                  <p className="mt-0.5 text-xs text-slate-500">{item.description}</p>
                ) : null}
              </div>
              <button onClick={() => remove(item.id)} className="text-slate-400 hover:text-slate-700">
                <X size={14} />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
