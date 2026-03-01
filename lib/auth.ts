import { cookies, headers } from 'next/headers';
import { AuthUser, Role } from '@/types';
import { fetchSharedMainSession } from './shared-main-session';

const sanitizeStudentId = (value: unknown) =>
  typeof value === 'string' ? value.trim().slice(0, 120) : '';

const sanitizeText = (value: unknown, max = 240) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

type ResolvedAuthState = {
  role: Role | null;
  studentId: string | null;
  studentEmail: string;
  studentName: string;
  adminUsername: string;
};

async function resolveAuthState() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const host = headerStore.get('host') || '';

  const sharedSession = await fetchSharedMainSession({
    cookieHeader: cookieStore.toString(),
    hostname: host,
    requestHost: host,
  });

  if (sharedSession?.role === 'ADMIN') {
    return {
      role: 'ADMIN',
      studentId: null,
      studentEmail: '',
      studentName: '',
      adminUsername: sanitizeText(sharedSession.adminUsername, 120),
    } satisfies ResolvedAuthState;
  }

  if (sharedSession?.role === 'STUDENT') {
    return {
      role: 'STUDENT',
      studentId: sanitizeStudentId(sharedSession.studentId) || null,
      studentEmail: sanitizeText(sharedSession.studentEmail, 320).toLowerCase(),
      studentName: sanitizeText(sharedSession.studentName, 120),
      adminUsername: '',
    } satisfies ResolvedAuthState;
  }

  return {
    role: null as Role | null,
    studentId: null as string | null,
    studentEmail: '',
    studentName: '',
    adminUsername: '',
  } satisfies ResolvedAuthState;
}

export async function getServerRole(): Promise<Role | null> {
  const authState = await resolveAuthState();
  return authState.role;
}

export async function getServerStudentId(): Promise<string | null> {
  const authState = await resolveAuthState();
  return authState.role === 'STUDENT' ? authState.studentId : null;
}

export async function getServerAuthUser(): Promise<AuthUser | null> {
  const authState = await resolveAuthState();
  const role = authState.role;
  if (!role) return null;

  if (role === 'ADMIN') {
    const normalizedAdminName = sanitizeText(authState.adminUsername, 120);
    const adminName = normalizedAdminName || 'Admin';
    const adminEmail = adminName.includes('@')
      ? adminName.toLowerCase()
      : '';
    const adminIdSeed = sanitizeText(normalizedAdminName || 'main-session', 120).toLowerCase();
    return {
      id: `admin:${adminIdSeed}`,
      name: adminName,
      role: 'ADMIN',
      email: adminEmail,
    };
  }

  const sharedEmail = sanitizeText(authState.studentEmail, 320).toLowerCase();
  const studentId = authState.studentId;
  const sharedName = sanitizeText(authState.studentName, 120);
  const normalizedStudentId = sanitizeText(studentId, 120);
  const canonicalStudentId = sharedEmail || normalizedStudentId;
  const derivedName =
    sharedName || (sharedEmail ? sharedEmail.split('@')[0] : canonicalStudentId || 'Student');
  const derivedId =
    sharedEmail
      ? `student:${sharedEmail}`
      : canonicalStudentId
        ? `student:${canonicalStudentId}`
        : 'student:main-session';

  return {
    id: derivedId,
    name: derivedName,
    role: 'STUDENT',
    email: sharedEmail,
    studentId: canonicalStudentId || undefined,
  };
}

export function requireRole(currentRole: Role | null, expected: Role) {
  return currentRole === expected;
}
