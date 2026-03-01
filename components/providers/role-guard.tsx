'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Role } from '@/types';
import { useAuthStore } from '@/store/auth-store';
import { Skeleton } from '@/components/ui/skeleton';

export function RoleGuard({
  allow,
  children,
}: {
  allow: Role;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const role = useAuthStore((state) => state.role);
  const loading = useAuthStore((state) => state.loading);

  useEffect(() => {
    if (!loading && role !== allow) {
      router.replace('/login');
    }
  }, [loading, role, allow, router]);

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
