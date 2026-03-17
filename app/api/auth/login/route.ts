import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { resolveMainSiteBaseUrl } from '@/lib/shared-main-session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const headerStore = await headers();
  const requestHost =
    (headerStore.get('x-forwarded-host') || headerStore.get('host') || '').trim();
  const mainLoginUrl = `${resolveMainSiteBaseUrl(requestHost)}/login`;
  return NextResponse.json(
    {
      ok: false,
      code: 'LOGIN_DISABLED',
      msg: `Direct login is disabled on test subdomain. Please login on ${mainLoginUrl}.`,
      loginUrl: mainLoginUrl,
    },
    { status: 403 }
  );
}
