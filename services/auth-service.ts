import { AuthUser } from '@/types';

type LoginPayload = {
  email: string;
  password: string;
  mobile: string;
  fingerprint: string;
  termsAccepted: boolean;
};

type LoginResult =
  | {
      ok: true;
      user: AuthUser;
    }
  | {
      ok: false;
      msg: string;
      code?: string;
      status: number;
    };

export async function login(payload: LoginPayload): Promise<LoginResult> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    user?: AuthUser;
    msg?: string;
    code?: string;
  };

  if (!response.ok || data?.ok !== true || !data?.user) {
    return {
      ok: false,
      msg: data?.msg || 'Login failed.',
      code: data?.code,
      status: response.status || 500,
    };
  }

  return { ok: true, user: data.user };
}

export async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' });
}

export async function getMe(): Promise<AuthUser | null> {
  const response = await fetch('/api/auth/me', { cache: 'no-store' });
  if (!response.ok) return null;
  const data = (await response.json()) as { user: AuthUser | null };
  return data.user;
}
