'use client';

import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/auth-store';
import { useToastStore } from '@/store/toast-store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import * as authService from '@/services/auth-service';
import { Role } from '@/types';

type LoginForm = {
  email: string;
  password: string;
  mobile: string;
  termsAccepted: boolean;
};

const normalizeCallbackPath = (value: string | null) => {
  const callback = (value || '').trim();
  if (!callback.startsWith('/')) return '';
  if (callback.startsWith('//')) return '';
  return callback;
};

function resolvePostLoginPath(role: Role, callbackPath: string) {
  const defaultPath = role === 'ADMIN' ? '/admin/dashboard' : '/student/dashboard';
  if (!callbackPath) return defaultPath;

  if (role === 'ADMIN' && callbackPath.startsWith('/admin')) return callbackPath;
  if (role === 'STUDENT' && callbackPath.startsWith('/student')) return callbackPath;
  return defaultPath;
}

function readOrCreateDeviceSeed() {
  if (typeof window === 'undefined') return '';
  const storageKey = 'tms_device_seed';
  const existing = (window.localStorage.getItem(storageKey) || '').trim();
  if (existing) return existing;
  const created =
    typeof window.crypto?.randomUUID === 'function'
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem(storageKey, created);
  return created;
}

function createFingerprint() {
  if (typeof window === 'undefined') return '';
  const seed = readOrCreateDeviceSeed();
  const nav = window.navigator;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown';
  return [
    seed,
    nav.userAgent || 'ua',
    nav.language || 'lang',
    nav.platform || 'platform',
    String(window.screen?.width || 0),
    String(window.screen?.height || 0),
    tz,
  ]
    .join('|')
    .slice(0, 600);
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hydrate = useAuthStore((state) => state.hydrate);
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const loading = useAuthStore((state) => state.loading);
  const pushToast = useToastStore((state) => state.push);

  const [form, setForm] = useState<LoginForm>({
    email: '',
    password: '',
    mobile: '',
    termsAccepted: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [fingerprint, setFingerprint] = useState('');

  const callbackPath = normalizeCallbackPath(searchParams.get('callbackUrl'));

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    setFingerprint(createFingerprint());
  }, []);

  useEffect(() => {
    if (loading || !role || !user) return;
    router.replace(resolvePostLoginPath(role, callbackPath));
  }, [loading, role, user, router, callbackPath]);

  const canSubmit = useMemo(() => !loading && !submitting, [loading, submitting]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');

    const email = form.email.trim().toLowerCase();
    const password = form.password;
    const mobile = form.mobile.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMessage('Valid email enter karo.');
      return;
    }
    if (password.length < 8) {
      setMessage('Password minimum 8 characters hona chahiye.');
      return;
    }
    if (!/^\d{10}$/.test(mobile)) {
      setMessage('Mobile number exactly 10 digits hona chahiye.');
      return;
    }
    if (!form.termsAccepted) {
      setMessage('Terms & Conditions accept karo.');
      return;
    }
    if (!fingerprint) {
      setMessage('Device fingerprint ready nahi hai. Page refresh karo.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await authService.login({
        email,
        password,
        mobile,
        fingerprint,
        termsAccepted: true,
      });

      if (!result.ok) {
        setMessage(result.msg || 'Login failed.');
        pushToast({
          kind: 'error',
          title: 'Login failed',
          description: result.msg || 'Credentials verify nahi hue.',
        });
        return;
      }

      await hydrate();
      pushToast({ kind: 'success', title: 'Login successful' });
      router.replace(resolvePostLoginPath('STUDENT', callbackPath));
    } catch {
      setMessage('Unexpected error. Dobara try karo.');
    } finally {
      setSubmitting(false);
    }
  };

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
              Domain-specific login. Session main domain se share nahi hota.
            </p>
          </div>

          <form className="space-y-4" onSubmit={onSubmit}>
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="student@example.com"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, password: event.target.value }))
                }
                placeholder="Password"
                autoComplete="current-password"
                required
              />
            </div>

            <div>
              <label htmlFor="mobile" className="mb-1 block text-sm font-medium text-slate-700">
                Mobile Number
              </label>
              <Input
                id="mobile"
                type="tel"
                value={form.mobile}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    mobile: event.target.value.replace(/\D/g, '').slice(0, 10),
                  }))
                }
                placeholder="10 digit mobile"
                autoComplete="tel"
                inputMode="numeric"
                maxLength={10}
                required
              />
            </div>

            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.termsAccepted}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, termsAccepted: event.target.checked }))
                }
                className="mt-0.5 h-4 w-4 rounded border-slate-300"
              />
              <span>I accept the Terms & Conditions</span>
            </label>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              {fingerprint ? 'Device fingerprint ready.' : 'Preparing device fingerprint...'}
            </div>

            {message ? <p className="text-sm text-red-600">{message}</p> : null}

            <Button type="submit" className="w-full" disabled={!canSubmit}>
              {submitting ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </Card>
      </motion.div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}
