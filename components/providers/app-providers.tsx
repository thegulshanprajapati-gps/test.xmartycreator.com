'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { ToastViewport } from '@/components/ui/toast-viewport';
import { ThemeProvider } from '@/components/providers/theme-provider';

export function AppProviders({ children }: { children: React.ReactNode }) {
  const hydrate = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <ThemeProvider>
      {children}
      <ToastViewport />
    </ThemeProvider>
  );
}
