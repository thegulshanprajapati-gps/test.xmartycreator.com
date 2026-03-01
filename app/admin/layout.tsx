import { AdminShell } from '@/components/admin/admin-shell';
import { RoleGuard } from '@/components/providers/role-guard';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allow="ADMIN">
      <AdminShell>{children}</AdminShell>
    </RoleGuard>
  );
}
