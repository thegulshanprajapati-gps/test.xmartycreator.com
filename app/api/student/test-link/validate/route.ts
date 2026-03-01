import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthUser } from '@/lib/auth';
import { checkTestAccess } from '@/lib/access-control';
import {
  consumeSecureTestLink,
  sanitizeDeviceKey,
  SECURE_TEST_DEVICE_COOKIE,
} from '@/lib/secure-test-link';
import { Attempt, Student, Test } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = {
  testId?: string;
  token?: string;
};

function sanitizeId(value: unknown) {
  return typeof value === 'string' ? value.trim().slice(0, 120) : '';
}

function sanitizeToken(value: unknown) {
  return typeof value === 'string' ? value.trim().slice(0, 400) : '';
}

async function fetchApi<T>(request: NextRequest, path: string): Promise<T | null> {
  try {
    const response = await fetch(`${request.nextUrl.origin}${path}`, {
      headers: {
        cookie: request.headers.get('cookie') || '',
      },
      cache: 'no-store',
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getServerAuthUser();
    if (!user || user.role !== 'STUDENT' || !user.studentId) {
      return NextResponse.json(
        { ok: false, code: 'UNAUTHORIZED', message: 'Student login required.' },
        { status: 401 }
      );
    }

    const body = (await request.json()) as Body;
    const testId = sanitizeId(body?.testId);
    const token = sanitizeToken(body?.token);
    if (!testId || !token) {
      return NextResponse.json(
        { ok: false, code: 'INVALID_TOKEN', message: 'Secure test link is invalid.' },
        { status: 400 }
      );
    }

    const [test, student, attempts] = await Promise.all([
      fetchApi<Test>(request, `/api/tests?id=${encodeURIComponent(testId)}`),
      fetchApi<Student>(request, `/api/students?id=${encodeURIComponent(user.studentId)}`),
      fetchApi<Attempt[]>(
        request,
        `/api/attempts?studentId=${encodeURIComponent(user.studentId)}`
      ),
    ]);

    if (!test || !student || !attempts) {
      return NextResponse.json(
        { ok: false, code: 'NOT_FOUND', message: 'Test or student not found.' },
        { status: 404 }
      );
    }

    const access = checkTestAccess({ test, student, attempts });
    if (!access.allowed) {
      return NextResponse.json(
        {
          ok: false,
          code: access.reason,
          message: access.message,
        },
        { status: 403 }
      );
    }

    const deviceKey = sanitizeDeviceKey(
      request.cookies.get(SECURE_TEST_DEVICE_COOKIE)?.value
    );
    const validation = consumeSecureTestLink({
      token,
      testId,
      studentId: user.studentId,
      deviceKey,
      userAgent: request.headers.get('user-agent') || '',
    });

    if (!validation.ok) {
      return NextResponse.json(
        { ok: false, code: validation.code, message: validation.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[api/student/test-link/validate] Validation failed:', error);
    return NextResponse.json(
      { ok: false, code: 'SERVER_ERROR', message: 'Failed to validate secure link.' },
      { status: 500 }
    );
  }
}
