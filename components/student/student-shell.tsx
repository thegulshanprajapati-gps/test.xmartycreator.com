'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, MoonStar, Sun, X } from 'lucide-react';
import { useState } from 'react';
import { STUDENT_NAV_ITEMS } from '@/lib/constants';
import { cn } from '@/utils/helpers';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';
import { useThemeStore } from '@/store/theme-store';
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
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const pushToast = useToastStore((state) => state.push);

  const onLogout = async () => {
    await logout();
    pushToast({ kind: 'info', title: 'Session ended' });
    window.location.assign(resolveMainProjectBaseUrl());
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950/30">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-700 dark:bg-slate-900/85">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <button
            className="rounded-lg border border-slate-200 p-2 dark:border-slate-700 dark:text-slate-200 lg:hidden"
            onClick={() => setOpen((prev) => !prev)}
          >
            {open ? <X size={16} /> : <Menu size={16} />}
          </button>
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-600">
              Student Portal
            </p>
            <h1 className="text-base font-bold text-slate-900 dark:text-slate-100">Xmarty Test Series</h1>
          </div>
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{user?.name ?? 'Student'}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
          </div>
          <button
            onClick={toggleTheme}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            {theme === 'dark' ? <Sun size={13} /> : <MoonStar size={13} />}
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
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
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              )}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      {open ? (
        <nav className="grid gap-2 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900 lg:hidden">
          {STUDENT_NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className={cn(
                'rounded-xl px-3 py-2 text-sm font-medium transition',
                pathname === item.href || pathname.startsWith(`${item.href}/`)
                  ? 'bg-cyan-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
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
