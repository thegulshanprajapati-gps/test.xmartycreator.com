import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { fetchSharedMainSession, resolveMainSiteBaseUrl } from '@/lib/shared-main-session';
import { Role } from '@/types';

const normalizeStudentId = (value: unknown) =>
  typeof value === 'string' ? value.trim().slice(0, 120) : '';

const normalizeCallbackPath = (value: string | null) => {
  const callback = (value || '').trim();
  if (!callback.startsWith('/')) return '';
  if (callback.startsWith('//')) return '';
  return callback;
};

function resolveLoginRedirectPath(role: Role, callbackPath: string) {
  const defaultPath = role === 'ADMIN' ? '/admin/dashboard' : '/student/dashboard';
  if (!callbackPath) return defaultPath;

  if (role === 'ADMIN' && callbackPath.startsWith('/admin')) {
    return callbackPath;
  }
  if (role === 'STUDENT' && callbackPath.startsWith('/student')) {
    return callbackPath;
  }

  return defaultPath;
}

async function resolveRole(request: NextRequest): Promise<Role | null> {
  const requestHost =
    (request.headers.get('x-forwarded-host') || request.headers.get('host') || '').trim() ||
    request.nextUrl.host;
  const sharedSession = await fetchSharedMainSession({
    cookieHeader: request.headers.get('cookie') || '',
    hostname: request.nextUrl.hostname,
    requestHost,
  });
  if (!sharedSession) return null;
  if (sharedSession.role === 'ADMIN') return 'ADMIN';
  const studentId = normalizeStudentId(sharedSession.studentId || sharedSession.studentEmail);
  return studentId ? 'STUDENT' : null;
}

function resolveMainLoginUrl(request: NextRequest) {
  try {
    const mainBaseUrl = resolveMainSiteBaseUrl(request.nextUrl.hostname);
    const loginUrl = new URL('/login', mainBaseUrl);
    const currentHost = request.nextUrl.host.trim().toLowerCase();
    const targetHost = loginUrl.host.trim().toLowerCase();
    if (currentHost && targetHost && currentHost === targetHost) {
      const fallback = request.nextUrl.clone();
      fallback.pathname = '/';
      fallback.search = '';
      return fallback;
    }
    return loginUrl;
  } catch {
    const fallback = request.nextUrl.clone();
    fallback.pathname = '/';
    fallback.search = '';
    return fallback;
  }
}

export async function middleware(request: NextRequest) {
  const role = await resolveRole(request);
  const path = request.nextUrl.pathname;

  if (path.startsWith('/admin')) {
    if (role !== 'ADMIN') {
      return NextResponse.redirect(resolveMainLoginUrl(request));
    }
  }

  if (path.startsWith('/student')) {
    if (role !== 'STUDENT') {
      return NextResponse.redirect(resolveMainLoginUrl(request));
    }
  }

  if (path === '/login') {
    if (role === 'ADMIN' || role === 'STUDENT') {
      const callbackPath = normalizeCallbackPath(request.nextUrl.searchParams.get('callbackUrl'));
      const targetPath = resolveLoginRedirectPath(role, callbackPath);
      const targetUrl = new URL(targetPath, request.nextUrl.origin);
      const url = request.nextUrl.clone();
      url.pathname = targetUrl.pathname;
      url.search = targetUrl.search;
      return NextResponse.redirect(url);
    }
    return NextResponse.redirect(resolveMainLoginUrl(request));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/student/:path*', '/login'],
};
