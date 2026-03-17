import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getServerRole } from '@/lib/auth';
import { resolveMainSiteBaseUrl } from '@/lib/shared-main-session';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const role = await getServerRole();
  if (role === 'ADMIN') {
    redirect('/admin/dashboard');
  }
  if (role === 'STUDENT') {
    redirect('/student/dashboard');
  }

  const headerStore = await headers();
  const requestHost =
    (headerStore.get('x-forwarded-host') || headerStore.get('host') || '').trim();
  redirect(`${resolveMainSiteBaseUrl(requestHost)}/login`);
}
