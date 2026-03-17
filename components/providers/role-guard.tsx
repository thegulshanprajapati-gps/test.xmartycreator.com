'use client';

import { useEffect } from 'react';
import { Role } from '@/types';
import { useAuthStore } from '@/store/auth-store';
import { Skeleton } from '@/components/ui/skeleton';

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const isLiveMode = () => {
  const raw = (process.env.NEXT_PUBLIC_IS_LIVE || '').trim().toLowerCase();
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return process.env.NODE_ENV === 'production';
};

const resolveMainLoginUrl = () => {
  const liveBase = trimTrailingSlash(
    process.env.NEXT_PUBLIC_MAIN_SITE_URL || 'https://xmartycreator.com'
  );
  const localBase = trimTrailingSlash(
    process.env.NEXT_PUBLIC_MAIN_SITE_LOCAL_URL || 'http://localhost:3000'
  );
  const base = isLiveMode() ? liveBase : localBase;
  return `${base}/login`;
};

export function RoleGuard({
  allow,
  children,
}: {
  allow: Role;
  children: React.ReactNode;
}) {
  const role = useAuthStore((state) => state.role);
  const loading = useAuthStore((state) => state.loading);

  useEffect(() => {
    if (!loading && role !== allow) {
      window.location.assign(resolveMainLoginUrl());
    }
  }, [loading, role, allow]);

  if (loading || role !== allow) {
    return (
      <div className="space-y-3 p-6">
        <Skeleton className="h-12 w-56" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return <>{children}</>;
}
