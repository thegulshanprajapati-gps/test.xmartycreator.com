import { RoleGuard } from '@/components/providers/role-guard';
import { StudentShell } from '@/components/student/student-shell';

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allow="STUDENT">
      <StudentShell>{children}</StudentShell>
    </RoleGuard>
  );
}
