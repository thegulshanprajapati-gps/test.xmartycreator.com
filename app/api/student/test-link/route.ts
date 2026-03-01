import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthUser } from '@/lib/auth';
import { checkTestAccess } from '@/lib/access-control';
import {
  createDeviceKey,
  getDeviceCookieOptions,
  issueSecureTestLink,
  sanitizeDeviceKey,
  SECURE_TEST_DEVICE_COOKIE,
} from '@/lib/secure-test-link';
import { Attempt, Student, Test } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = {
  testId?: string;
};

function sanitizeId(value: unknown) {
  return typeof value === 'string' ? value.trim().slice(0, 120) : '';
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
    if (!testId) {
      return NextResponse.json(
        { ok: false, code: 'INVALID_TEST', message: 'Test ID is required.' },
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

    const incomingDevice = sanitizeDeviceKey(
      request.cookies.get(SECURE_TEST_DEVICE_COOKIE)?.value
    );
    const deviceKey = incomingDevice || createDeviceKey();
    const issued = issueSecureTestLink({
      testId,
      studentId: user.studentId,
      deviceKey,
      userAgent: request.headers.get('user-agent') || '',
    });

    if (!issued) {
      return NextResponse.json(
        { ok: false, code: 'ISSUE_FAILED', message: 'Unable to create secure link.' },
        { status: 500 }
      );
    }

    const response = NextResponse.json({
      ok: true,
      url: `/student/test/${encodeURIComponent(testId)}?launch=${encodeURIComponent(issued.token)}`,
      expiresAt: issued.expiresAt,
    });

    if (!incomingDevice) {
      response.cookies.set(
        SECURE_TEST_DEVICE_COOKIE,
        deviceKey,
        getDeviceCookieOptions()
      );
    }

    return response;
  } catch (error) {
    console.error('[api/student/test-link] Failed to issue secure test link:', error);
    return NextResponse.json(
      { ok: false, code: 'SERVER_ERROR', message: 'Failed to create secure link.' },
      { status: 500 }
    );
  }
}
