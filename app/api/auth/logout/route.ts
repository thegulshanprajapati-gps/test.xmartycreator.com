import { NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, AUTH_STUDENT_COOKIE, getAuthCookieOptions } from '@/lib/constants';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  const cookieOptions = getAuthCookieOptions();
  response.cookies.set(AUTH_COOKIE_NAME, '', { ...cookieOptions, maxAge: 0 });
  response.cookies.set(AUTH_STUDENT_COOKIE, '', { ...cookieOptions, maxAge: 0 });
  return response;
}
