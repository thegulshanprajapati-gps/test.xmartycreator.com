import { NextResponse } from 'next/server';
import {
  AUTH_COOKIE_NAME,
  AUTH_SCOPE_COOKIE,
  AUTH_STUDENT_COOKIE,
  getAuthCookieOptions,
} from '@/lib/constants';

const DEVICE_COOKIE_NAME = 'device_token';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  const cookieOptions = getAuthCookieOptions();
  response.cookies.set(AUTH_COOKIE_NAME, '', { ...cookieOptions, maxAge: 0 });
  response.cookies.set(AUTH_STUDENT_COOKIE, '', { ...cookieOptions, maxAge: 0 });
  response.cookies.set(AUTH_SCOPE_COOKIE, '', { ...cookieOptions, maxAge: 0 });
  response.cookies.set(DEVICE_COOKIE_NAME, '', {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
  });
  return response;
}
