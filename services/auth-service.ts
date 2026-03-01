import { AuthUser } from '@/types';

export async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' });
}

export async function getMe(): Promise<AuthUser | null> {
  const response = await fetch('/api/auth/me', { cache: 'no-store' });
  if (!response.ok) return null;
  const data = (await response.json()) as { user: AuthUser | null };
  return data.user;
}
