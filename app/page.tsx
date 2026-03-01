import { redirect } from 'next/navigation';
import { getServerRole } from '@/lib/auth';

export default async function RootPage() {
  const role = await getServerRole();
  if (role === 'ADMIN') {
    redirect('/admin/dashboard');
  }
  if (role === 'STUDENT') {
    redirect('/student/dashboard');
  }
  redirect('/login');
}
