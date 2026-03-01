import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  AUTH_COOKIE_NAME,
  AUTH_STUDENT_COOKIE,
  getAuthCookieOptions,
} from '@/lib/constants';
import { Role } from '@/types';
import { fetchSharedMainSession } from '@/lib/shared-main-session';

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

export async function middleware(request: NextRequest) {
  let role: Role | null = null;
  const fallbackStudentId = normalizeStudentId(request.cookies.get(AUTH_STUDENT_COOKIE)?.value);
  let syncedRole: Role | null = null;
  let syncedStudentId = '';

  const sharedSession = await fetchSharedMainSession({
    cookieHeader: request.headers.get('cookie') || '',
    hostname: request.nextUrl.hostname,
    requestHost: request.nextUrl.host,
  });

  if (sharedSession?.role) {
    syncedRole = sharedSession.role;
    role = sharedSession.role;
    syncedStudentId =
      sharedSession.role === 'STUDENT'
        ? normalizeStudentId(sharedSession.studentId) || fallbackStudentId
        : '';
  }

  const path = request.nextUrl.pathname;
  const cookieOptions = getAuthCookieOptions();

  const withSyncedCookies = (response: NextResponse) => {
    if (!syncedRole) {
      response.cookies.set(AUTH_COOKIE_NAME, '', { ...cookieOptions, maxAge: 0 });
      response.cookies.set(AUTH_STUDENT_COOKIE, '', { ...cookieOptions, maxAge: 0 });
      return response;
    }

    response.cookies.set(AUTH_COOKIE_NAME, syncedRole, cookieOptions);
    if (syncedRole === 'STUDENT') {
      if (syncedStudentId) {
        response.cookies.set(AUTH_STUDENT_COOKIE, syncedStudentId, cookieOptions);
      } else {
        response.cookies.set(AUTH_STUDENT_COOKIE, '', { ...cookieOptions, maxAge: 0 });
      }
    } else {
      response.cookies.set(AUTH_STUDENT_COOKIE, '', { ...cookieOptions, maxAge: 0 });
    }

    return response;
  };

  if (path.startsWith('/admin')) {
    if (role !== 'ADMIN') {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('callbackUrl', `${path}${request.nextUrl.search}`);
      return withSyncedCookies(NextResponse.redirect(url));
    }
  }

  if (path.startsWith('/student')) {
    if (role !== 'STUDENT') {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('callbackUrl', `${path}${request.nextUrl.search}`);
      return withSyncedCookies(NextResponse.redirect(url));
    }
  }

  if (path === '/login' && (role === 'ADMIN' || role === 'STUDENT')) {
    const callbackPath = normalizeCallbackPath(request.nextUrl.searchParams.get('callbackUrl'));
    const targetPath = resolveLoginRedirectPath(role, callbackPath);
    const targetUrl = new URL(targetPath, request.nextUrl.origin);
    const url = request.nextUrl.clone();
    url.pathname = targetUrl.pathname;
    url.search = targetUrl.search;
    return withSyncedCookies(NextResponse.redirect(url));
  }

  return withSyncedCookies(NextResponse.next());
}

export const config = {
  matcher: ['/admin/:path*', '/student/:path*', '/login'],
};
