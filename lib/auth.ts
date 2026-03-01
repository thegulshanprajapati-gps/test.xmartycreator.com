import { cookies } from 'next/headers';
import { AuthUser, Role } from '@/types';
import {
  AUTH_COOKIE_NAME,
  AUTH_SCOPE_COOKIE,
  AUTH_SCOPE_VALUE,
  AUTH_STUDENT_COOKIE,
} from './constants';

const sanitizeStudentId = (value: unknown) =>
  typeof value === 'string' ? value.trim().toLowerCase().slice(0, 120) : '';

const sanitizeText = (value: unknown, max = 240) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

const normalizeRole = (value: unknown): Role | null =>
  value === 'ADMIN' || value === 'STUDENT' ? value : null;

type ResolvedAuthState = {
  role: Role | null;
  studentId: string | null;
};

async function resolveAuthState(): Promise<ResolvedAuthState> {
  const cookieStore = await cookies();
  const scope = (cookieStore.get(AUTH_SCOPE_COOKIE)?.value || '').trim();
  const role = normalizeRole(cookieStore.get(AUTH_COOKIE_NAME)?.value);
  const studentId = sanitizeStudentId(cookieStore.get(AUTH_STUDENT_COOKIE)?.value);

  if (!role || scope !== AUTH_SCOPE_VALUE) {
    return { role: null, studentId: null };
  }

  if (role === 'STUDENT' && !studentId) {
    return { role: null, studentId: null };
  }

  return {
    role,
    studentId: role === 'STUDENT' ? studentId : null,
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
      id: 'admin:local',
      name: 'Admin',
      role: 'ADMIN',
      email: '',
    };
  }

  const studentId = sanitizeStudentId(authState.studentId);
  const email = studentId.includes('@') ? studentId : '';
  const fallbackName = email ? email.split('@')[0] : 'Student';
  const name = sanitizeText(fallbackName, 120) || 'Student';
  const id = studentId ? `student:${studentId}` : 'student:local';

  return {
    id,
    name,
    role: 'STUDENT',
    email,
    studentId: studentId || undefined,
  };
}

export function requireRole(currentRole: Role | null, expected: Role) {
  return currentRole === expected;
}
