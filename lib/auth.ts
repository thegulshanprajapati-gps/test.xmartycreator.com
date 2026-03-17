import { headers } from 'next/headers';
import { AuthUser, Role } from '@/types';
import { fetchSharedMainSession } from './shared-main-session';

const sanitizeStudentId = (value: unknown) =>
  typeof value === 'string' ? value.trim().toLowerCase().slice(0, 120) : '';

const sanitizeEmail = (value: unknown) =>
  typeof value === 'string' ? value.trim().toLowerCase().slice(0, 320) : '';

const sanitizeText = (value: unknown, max = 240) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

type ResolvedAuthState = {
  role: Role | null;
  studentId: string | null;
  email: string;
  name: string;
};

async function resolveAuthState(): Promise<ResolvedAuthState> {
  const headerStore = await headers();
  const cookieHeader = sanitizeText(headerStore.get('cookie'), 5000);
  const requestHost = sanitizeText(
    headerStore.get('x-forwarded-host') || headerStore.get('host'),
    260
  ).toLowerCase();

  const sharedSession = await fetchSharedMainSession({
    cookieHeader,
    hostname: requestHost,
    requestHost,
  });

  if (!sharedSession) {
    return { role: null, studentId: null, email: '', name: '' };
  }

  if (sharedSession.role === 'ADMIN') {
    return {
      role: 'ADMIN',
      studentId: null,
      email: '',
      name: sanitizeText(sharedSession.adminUsername, 120) || 'Admin',
    };
  }

  const studentId = sanitizeStudentId(sharedSession.studentId || sharedSession.studentEmail);
  const email = sanitizeEmail(sharedSession.studentEmail || studentId);
  if (!studentId && !email) {
    return { role: null, studentId: null, email: '', name: '' };
  }

  const fallbackName =
    email && email.includes('@') ? sanitizeText(email.split('@')[0], 120) : 'Student';

  return {
    role: 'STUDENT',
    studentId: studentId || email,
    email,
    name: sanitizeText(sharedSession.studentName, 120) || fallbackName || 'Student',
  };
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
    return {
      id: 'admin:shared',
      name: authState.name || 'Admin',
      role: 'ADMIN',
      email: '',
    };
  }

  const studentId = sanitizeStudentId(authState.studentId);
  const email = sanitizeEmail(authState.email || studentId);
  const fallbackName = email && email.includes('@') ? email.split('@')[0] : 'Student';
  const name = sanitizeText(authState.name || fallbackName, 120) || 'Student';
  const canonicalId = studentId || email;
  const id = canonicalId ? `student:${canonicalId}` : 'student:shared';

  return {
    id,
    name,
    role: 'STUDENT',
    email,
    studentId: canonicalId || undefined,
  };
}

export function requireRole(currentRole: Role | null, expected: Role) {
  return currentRole === expected;
}
