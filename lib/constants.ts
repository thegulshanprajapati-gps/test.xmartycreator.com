export const AUTH_COOKIE_NAME = 'tms_role';
export const AUTH_STUDENT_COOKIE = 'tms_student_id';
export const AUTH_SCOPE_COOKIE = 'tms_auth_scope';
export const AUTH_SCOPE_VALUE = 'local';

const authCookieDomain = (process.env.TMS_COOKIE_DOMAIN || '').trim();

export function getAuthCookieOptions() {
  return {
    path: '/',
    httpOnly: false,
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 30,
    ...(authCookieDomain ? { domain: authCookieDomain } : {}),
  };
}

export const ADMIN_NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/tests', label: 'Tests' },
  { href: '/admin/questions', label: 'Questions' },
  { href: '/admin/results', label: 'Results' },
  { href: '/admin/batches', label: 'Batches' },
  { href: '/admin/courses', label: 'Courses' },
  { href: '/admin/enrollments', label: 'Enrollments' },
];

export const STUDENT_NAV_ITEMS = [
  { href: '/student/dashboard', label: 'Dashboard' },
  { href: '/student/batch', label: 'Batch' },
  { href: '/student/courses-enrolled', label: 'Test Store' },
  { href: '/student/tests-enrolled', label: 'Enrolled Tests' },
  { href: '/student/profile', label: 'Profile' },
];
