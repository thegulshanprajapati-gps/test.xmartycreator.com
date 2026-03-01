'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/auth-store';
import { useToastStore } from '@/store/toast-store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

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

export default function LoginPage() {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const hydrate = useAuthStore((state) => state.hydrate);
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const loading = useAuthStore((state) => state.loading);
  const pushToast = useToastStore((state) => state.push);
  const redirectedRef = useRef(false);
  const [mainLoginUrl, setMainLoginUrl] = useState('');

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (loading || role || user) return;
    if (typeof window === 'undefined') return;

    const currentSearch = new URLSearchParams(window.location.search);
    const callbackParam = (currentSearch.get('callbackUrl') || '').trim();
    const callbackTarget =
      callbackParam && callbackParam.startsWith('/')
        ? `${window.location.origin}${callbackParam}`
        : `${window.location.origin}${window.location.pathname}${window.location.search}`;

    const mainBase = resolveMainProjectBaseUrl();
    const url = new URL('/login', `${mainBase}/`);
    url.searchParams.set('callbackUrl', callbackTarget);

    const targetUrl = url.toString();
    setMainLoginUrl(targetUrl);

    if (!redirectedRef.current) {
      redirectedRef.current = true;
      window.location.assign(targetUrl);
    }
  }, [loading, role, user]);

  const roleLabel = role === 'ADMIN' ? 'Admin' : 'Student';
  const targetPath = role === 'ADMIN' ? '/admin/dashboard' : '/student/dashboard';

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <Card className="space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
              Xmarty Creator
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Test Management Login</h1>
            <p className="mt-1 text-sm text-slate-500">
              Main app session fetch + role based access control.
            </p>
          </div>

          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Fetching session from main project...
            </div>
          ) : user && role ? (
            <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
              <p className="text-sm font-semibold text-emerald-800">
                Active session found. Continue to Test Management.
              </p>
              <div>
                <p className="text-xs uppercase tracking-wide text-emerald-700/90">Role</p>
                <p className="text-sm font-medium text-emerald-900">{roleLabel}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-emerald-700/90">Name</p>
                <p className="text-sm font-medium text-emerald-900">{user.name}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-emerald-700/90">Email</p>
                <p className="text-sm font-medium text-emerald-900">{user.email}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" onClick={() => router.push(targetPath)}>
                  Continue as {roleLabel}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    await logout();
                    pushToast({ kind: 'info', title: 'Session cleared' });
                  }}
                >
                  Clear Session
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="text-xs text-amber-900">
                No shared session found. Redirecting to main project login UI...
              </div>
              <div className="text-xs text-amber-800/90">
                Note: shared session works only when both apps use the same domain context.
              </div>
              <Button
                type="button"
                className="w-full"
                onClick={() => {
                  if (!mainLoginUrl) return;
                  window.location.assign(mainLoginUrl);
                }}
                disabled={!mainLoginUrl}
              >
                Open Main Login
              </Button>
            </div>
          )}

          <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
            Admin route: <code>/admin/*</code> | Student route: <code>/student/*</code>
          </div>
        </Card>
      </motion.div>
    </main>
  );
}

