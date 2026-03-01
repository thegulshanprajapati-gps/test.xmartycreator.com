import { NextRequest, NextResponse } from 'next/server';
import {
  AUTH_COOKIE_NAME,
  AUTH_SCOPE_COOKIE,
  AUTH_SCOPE_VALUE,
  AUTH_STUDENT_COOKIE,
  getAuthCookieOptions,
} from '@/lib/constants';
import { AuthUser } from '@/types';

export const runtime = 'nodejs';

type LoginBody = {
  email?: string;
  password?: string;
  mobile?: string;
  fingerprint?: string;
  termsAccepted?: boolean;
};

type UpstreamLoginResponse = {
  ok?: boolean;
  msg?: string;
  code?: string;
  user?: {
    email?: string;
  };
  profile?: {
    name?: string;
  };
};

const DEVICE_COOKIE_NAME = 'device_token';
const DEVICE_COOKIE_MAX_AGE = 60 * 60 * 24 * 180;

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const normalizeOptionalBaseUrl = (value: string | undefined) => {
  const candidate = (value || '').trim();
  if (!candidate) return '';
  if (!/^https?:\/\//i.test(candidate)) return '';
  return trimTrailingSlash(candidate);
};

function isLiveMode() {
  const raw = (process.env.NEXT_PUBLIC_IS_LIVE || process.env.IS_LIVE || '')
    .trim()
    .toLowerCase();
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return process.env.NODE_ENV === 'production';
}

function resolveMainProjectBaseUrl() {
  const liveBase =
    normalizeOptionalBaseUrl(process.env.MAIN_SITE_URL) ||
    normalizeOptionalBaseUrl(process.env.NEXT_PUBLIC_MAIN_SITE_URL) ||
    'https://xmartycreator.com';
  const localBase =
    normalizeOptionalBaseUrl(process.env.MAIN_SITE_LOCAL_URL) ||
    normalizeOptionalBaseUrl(process.env.NEXT_PUBLIC_MAIN_SITE_LOCAL_URL) ||
    'http://localhost:3000';
  return isLiveMode() ? liveBase : localBase;
}

const sanitizeEmail = (value: unknown) =>
  typeof value === 'string' ? value.trim().toLowerCase().slice(0, 320) : '';

const sanitizeText = (value: unknown, max = 120) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

function resolveStudentName(email: string, candidate?: string) {
  const normalized = sanitizeText(candidate, 120);
  if (normalized) return normalized;
  if (email.includes('@')) return email.split('@')[0] || 'Student';
  return 'Student';
}

function extractDeviceCookieToken(setCookieHeader: string) {
  if (!setCookieHeader) return '';
  const match = setCookieHeader.match(
    new RegExp(`(?:^|,\\s*)${DEVICE_COOKIE_NAME}=([^;,\\s]+)`, 'i')
  );
  if (!match?.[1]) return '';
  return decodeURIComponent(match[1]).trim().slice(0, 300);
}

function badRequest(msg: string) {
  return NextResponse.json({ ok: false, msg }, { status: 400 });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LoginBody;
    const email = sanitizeEmail(body?.email);
    const password = sanitizeText(body?.password, 500);
    const mobile = sanitizeText(body?.mobile, 20);
    const fingerprint = sanitizeText(body?.fingerprint, 600);
    const termsAccepted = body?.termsAccepted === true;

    if (!email) return badRequest('Email is required.');
    if (!password) return badRequest('Password is required.');
    if (!mobile) return badRequest('Mobile number is required.');
    if (!fingerprint) return badRequest('Fingerprint is required.');
    if (!termsAccepted) return badRequest('Please accept Terms & Conditions.');

    const upstream = await fetch(`${resolveMainProjectBaseUrl()}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: request.headers.get('cookie') || '',
      },
      body: JSON.stringify({
        email,
        password,
        mobile,
        fingerprint,
        termsAccepted: true,
      }),
      cache: 'no-store',
    });

    const payload = (await upstream.json().catch(() => ({}))) as UpstreamLoginResponse;

    if (!upstream.ok || payload?.ok !== true) {
      const status = upstream.status || 401;
      return NextResponse.json(
        {
          ok: false,
          msg: sanitizeText(payload?.msg, 500) || 'Login failed.',
          code: sanitizeText(payload?.code, 120) || undefined,
        },
        { status }
      );
    }

    const studentEmail = sanitizeEmail(payload?.user?.email) || email;
    if (!studentEmail) {
      return NextResponse.json(
        { ok: false, msg: 'Unable to resolve student account.' },
        { status: 500 }
      );
    }

    const authUser: AuthUser = {
      id: `student:${studentEmail}`,
      name: resolveStudentName(studentEmail, payload?.profile?.name),
      role: 'STUDENT',
      email: studentEmail,
      studentId: studentEmail,
    };

    const response = NextResponse.json({ ok: true, user: authUser });
    const cookieOptions = getAuthCookieOptions();
    response.cookies.set(AUTH_COOKIE_NAME, 'STUDENT', cookieOptions);
    response.cookies.set(AUTH_STUDENT_COOKIE, studentEmail, cookieOptions);
    response.cookies.set(AUTH_SCOPE_COOKIE, AUTH_SCOPE_VALUE, cookieOptions);

    const upstreamSetCookie = upstream.headers.get('set-cookie') || '';
    const deviceCookieToken = extractDeviceCookieToken(upstreamSetCookie);
    if (deviceCookieToken) {
      response.cookies.set(DEVICE_COOKIE_NAME, deviceCookieToken, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: DEVICE_COOKIE_MAX_AGE,
      });
    }

    return response;
  } catch {
    return NextResponse.json({ ok: false, msg: 'Login failed.' }, { status: 500 });
  }
}
