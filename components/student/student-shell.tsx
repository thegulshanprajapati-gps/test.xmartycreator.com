'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { STUDENT_NAV_ITEMS } from '@/lib/constants';
import { cn } from '@/utils/helpers';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';
import { useToastStore } from '@/store/toast-store';

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const isLiveMode = () => {
  const raw = (process.env.NEXT_PUBLIC_IS_LIVE || '').trim().toLowerCase();
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return process.env.NODE_ENV === 'production';
};

const resolveMainProjectBaseUrl = () => {
  const liveBase = trimTrailingSlash(
    process.env.NEXT_PUBLIC_MAIN_SITE_URL || 'https://xmartycreator.com'
  );
  const localBase = trimTrailingSlash(
    process.env.NEXT_PUBLIC_MAIN_SITE_LOCAL_URL || 'http://localhost:3000'
  );
  return isLiveMode() ? liveBase : localBase;
};

export function StudentShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const pushToast = useToastStore((state) => state.push);

  const onLogout = async () => {
    await logout();
    pushToast({ kind: 'info', title: 'Session ended' });
    window.location.assign(resolveMainProjectBaseUrl());
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <button
            className="rounded-lg border border-slate-200 p-2 lg:hidden"
            onClick={() => setOpen((prev) => !prev)}
          >
            {open ? <X size={16} /> : <Menu size={16} />}
          </button>
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-600">
              Student Portal
            </p>
            <h1 className="text-base font-bold text-slate-900">Xmarty Test Series</h1>
          </div>
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold text-slate-900">{user?.name ?? 'Student'}</p>
            <p className="text-xs text-slate-500">{user?.email}</p>
          </div>
          <Button variant="outline" onClick={onLogout}>
            Logout
          </Button>
        </div>

        <nav
          className={cn(
            'mx-auto hidden max-w-7xl gap-2 px-4 pb-3 lg:flex',
            open && 'grid'
          )}
        >
          {STUDENT_NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className={cn(
                'rounded-xl px-3 py-2 text-sm font-medium transition',
                pathname === item.href || pathname.startsWith(`${item.href}/`)
                  ? 'bg-cyan-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              )}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      {open ? (
        <nav className="grid gap-2 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          {STUDENT_NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className={cn(
                'rounded-xl px-3 py-2 text-sm font-medium transition',
                pathname === item.href || pathname.startsWith(`${item.href}/`)
                  ? 'bg-cyan-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              )}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}

      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
