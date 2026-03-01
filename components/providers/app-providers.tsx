'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { ToastViewport } from '@/components/ui/toast-viewport';

export function AppProviders({ children }: { children: React.ReactNode }) {
  const hydrate = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <>
      {children}
      <ToastViewport />
    </>
  );
}
