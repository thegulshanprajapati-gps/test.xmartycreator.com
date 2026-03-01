import { Role } from '@/types';

const DEFAULT_MAIN_SITE_URL = 'https://xmartycreator.com';
const LOCAL_MAIN_SITE_URL = 'http://localhost:3000';

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const normalizeOptionalBaseUrl = (value: string | undefined) => {
  const candidate = (value || '').trim();
  if (!candidate) return '';
  if (!/^https?:\/\//i.test(candidate)) return '';
  return trimTrailingSlash(candidate);
};

const normalizeRole = (value: unknown): Role | null =>
  value === 'ADMIN' || value === 'STUDENT' ? value : null;

const sanitizeText = (value: unknown, max = 200) => {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
};

export type SharedMainSession = {
  role: Role;
  adminUsername?: string;
  studentId?: string;
  studentEmail?: string;
  studentName?: string;
};

function isLiveMode() {
  const raw = (process.env.NEXT_PUBLIC_IS_LIVE || process.env.IS_LIVE || '')
    .trim()
    .toLowerCase();
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return process.env.NODE_ENV === 'production';
}

export function resolveMainSiteBaseUrl(_hostname?: string) {
  const liveUrl =
    normalizeOptionalBaseUrl(process.env.MAIN_SITE_URL) ||
    normalizeOptionalBaseUrl(process.env.NEXT_PUBLIC_MAIN_SITE_URL) ||
    DEFAULT_MAIN_SITE_URL;
  const localUrl =
    normalizeOptionalBaseUrl(process.env.MAIN_SITE_LOCAL_URL) ||
    normalizeOptionalBaseUrl(process.env.NEXT_PUBLIC_MAIN_SITE_LOCAL_URL) ||
    LOCAL_MAIN_SITE_URL;

  return isLiveMode() ? liveUrl : localUrl;
}

export async function fetchSharedMainSession(params: {
  cookieHeader?: string;
  hostname?: string;
  requestHost?: string;
}): Promise<SharedMainSession | null> {
  const cookieHeader = sanitizeText(params.cookieHeader, 5000);
  if (!cookieHeader) return null;

  const baseUrl = resolveMainSiteBaseUrl(params.hostname);
  const requestHost = (params.requestHost || '').trim().toLowerCase();

  try {
    const baseHost = new URL(baseUrl).host.trim().toLowerCase();
    if (requestHost && baseHost && requestHost === baseHost) {
      return null;
    }
  } catch {
    return null;
  }

  try {
    const response = await fetch(`${baseUrl}/api/auth/shared-session`, {
      method: 'GET',
      headers: { cookie: cookieHeader },
      cache: 'no-store',
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      authenticated?: boolean;
      role?: Role;
      username?: string;
      student?: {
        id?: string;
        email?: string;
        name?: string;
      };
    };

    if (data.authenticated !== true) return null;

    const role = normalizeRole(data.role);
    if (!role) return null;

    if (role === 'ADMIN') {
      return {
        role,
        adminUsername: sanitizeText(data.username, 120),
      };
    }

    return {
      role,
      studentId: sanitizeText(data.student?.id, 120),
      studentEmail: sanitizeText(data.student?.email, 320).toLowerCase(),
      studentName: sanitizeText(data.student?.name, 120),
    };
  } catch {
    return null;
  }
}

