import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  AUTH_COOKIE_NAME,
  AUTH_SCOPE_COOKIE,
  AUTH_SCOPE_VALUE,
  AUTH_STUDENT_COOKIE,
} from '@/lib/constants';
import { Role } from '@/types';

const normalizeStudentId = (value: unknown) =>
  typeof value === 'string' ? value.trim().slice(0, 120) : '';

const normalizeRole = (value: unknown): Role | null =>
  value === 'ADMIN' || value === 'STUDENT' ? value : null;

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
  const authScope = (request.cookies.get(AUTH_SCOPE_COOKIE)?.value || '').trim();
  const hasLocalScope = authScope === AUTH_SCOPE_VALUE;
  const cookieRole = normalizeRole(request.cookies.get(AUTH_COOKIE_NAME)?.value);
  const studentId = normalizeStudentId(request.cookies.get(AUTH_STUDENT_COOKIE)?.value);
  const role = hasLocalScope && !(cookieRole === 'STUDENT' && !studentId) ? cookieRole : null;

  const path = request.nextUrl.pathname;

  if (path.startsWith('/admin')) {
    if (role !== 'ADMIN') {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('callbackUrl', `${path}${request.nextUrl.search}`);
      return NextResponse.redirect(url);
    }
  }

  if (path.startsWith('/student')) {
    if (role !== 'STUDENT') {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('callbackUrl', `${path}${request.nextUrl.search}`);
      return NextResponse.redirect(url);
    }
  }

  if (path === '/login' && (role === 'ADMIN' || role === 'STUDENT')) {
    const callbackPath = normalizeCallbackPath(request.nextUrl.searchParams.get('callbackUrl'));
    const targetPath = resolveLoginRedirectPath(role, callbackPath);
    const targetUrl = new URL(targetPath, request.nextUrl.origin);
    const url = request.nextUrl.clone();
    url.pathname = targetUrl.pathname;
    url.search = targetUrl.search;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/student/:path*', '/login'],
};
