'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useThemeStore } from '@/store/theme-store';
import { Button } from './button';

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  theme?: 'light' | 'dark';
};

export function Modal({ open, title, onClose, children, theme }: Props) {
  const globalTheme = useThemeStore((state) => state.theme);
  const dark = (theme || globalTheme) === 'dark';
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className={`fixed inset-0 z-50 grid place-items-center p-4 ${
            dark ? 'bg-slate-950/65' : 'bg-slate-900/45'
          }`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className={`w-full max-w-xl rounded-2xl p-5 shadow-2xl ${
              dark
                ? 'border border-slate-700 bg-slate-800 text-slate-100'
                : 'bg-white text-slate-900'
            }`}
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3
                className={`text-lg font-semibold ${
                  dark ? 'text-slate-100' : 'text-slate-900'
                }`}
              >
                {title}
              </h3>
              <Button variant="ghost" onClick={onClose} className="h-8 w-8 rounded-full p-0">
                <X size={16} />
              </Button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
