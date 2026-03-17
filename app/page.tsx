import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getServerRole } from '@/lib/auth';
import { resolveMainSiteBaseUrl } from '@/lib/shared-main-session';

export default async function RootPage() {
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
  const mainSiteLoginUrl = `${resolveMainSiteBaseUrl(requestHost)}/login`;
  redirect(mainSiteLoginUrl);
}
