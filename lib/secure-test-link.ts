import { createHash, randomBytes } from 'crypto';

export const SECURE_TEST_DEVICE_COOKIE = 'tms_test_device_key';

type LaunchTicket = {
  token: string;
  testId: string;
  studentId: string;
  deviceKeyHash: string;
  userAgentHash: string;
  createdAt: number;
  expiresAt: number;
  usedAt: number | null;
};

type ConsumeResult =
  | { ok: true }
  | {
      ok: false;
      code:
        | 'INVALID_TOKEN'
        | 'EXPIRED_TOKEN'
        | 'ALREADY_USED'
        | 'DEVICE_MISMATCH'
        | 'USER_MISMATCH';
      message: string;
    };

const ACTIVE_TOKEN_TTL_MS = 1000 * 60 * 10;
const USED_TOKEN_RETENTION_MS = 1000 * 60 * 5;
const MAX_ACTIVE_TICKETS = 5000;

const tickets = new Map<string, LaunchTicket>();

function nowMs() {
  return Date.now();
}

function sanitizeText(value: unknown, max = 500) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

function hash(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function buildToken() {
  return randomBytes(24).toString('base64url');
}

function cleanExpiredTickets() {
  const now = nowMs();
  for (const [token, ticket] of tickets.entries()) {
    const isExpired = ticket.expiresAt <= now;
    const usedTooLong =
      ticket.usedAt !== null && now - ticket.usedAt > USED_TOKEN_RETENTION_MS;
    if (isExpired || usedTooLong) {
      tickets.delete(token);
    }
  }

  if (tickets.size <= MAX_ACTIVE_TICKETS) return;

  const sorted = [...tickets.values()].sort((a, b) => a.createdAt - b.createdAt);
  const toRemove = sorted.slice(0, tickets.size - MAX_ACTIVE_TICKETS);
  toRemove.forEach((ticket) => tickets.delete(ticket.token));
}

export function createDeviceKey() {
  return randomBytes(18).toString('base64url');
}

export function sanitizeDeviceKey(value: unknown) {
  const deviceKey = sanitizeText(value, 200);
  if (!deviceKey) return '';
  return /^[a-zA-Z0-9_-]{12,}$/.test(deviceKey) ? deviceKey : '';
}

export function getDeviceCookieOptions() {
  const domain =
    (process.env.TMS_COOKIE_DOMAIN || process.env.SESSION_COOKIE_DOMAIN || '').trim();
  return {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 30,
    ...(domain ? { domain } : {}),
  };
}

export function issueSecureTestLink(params: {
  testId: string;
  studentId: string;
  deviceKey: string;
  userAgent?: string;
}) {
  cleanExpiredTickets();

  const testId = sanitizeText(params.testId, 120);
  const studentId = sanitizeText(params.studentId, 120);
  const deviceKey = sanitizeDeviceKey(params.deviceKey);
  const userAgent = sanitizeText(params.userAgent, 400);

  if (!testId || !studentId || !deviceKey) {
    return null;
  }

  const token = buildToken();
  const ticket: LaunchTicket = {
    token,
    testId,
    studentId,
    deviceKeyHash: hash(deviceKey),
    userAgentHash: hash(userAgent || 'unknown-ua'),
    createdAt: nowMs(),
    expiresAt: nowMs() + ACTIVE_TOKEN_TTL_MS,
    usedAt: null,
  };
  tickets.set(token, ticket);
  return {
    token,
    expiresAt: new Date(ticket.expiresAt).toISOString(),
  };
}

export function consumeSecureTestLink(params: {
  token: string;
  testId: string;
  studentId: string;
  deviceKey: string;
  userAgent?: string;
}): ConsumeResult {
  cleanExpiredTickets();

  const token = sanitizeText(params.token, 300);
  const testId = sanitizeText(params.testId, 120);
  const studentId = sanitizeText(params.studentId, 120);
  const deviceKey = sanitizeDeviceKey(params.deviceKey);
  const userAgent = sanitizeText(params.userAgent, 400);

  if (!token || !testId || !studentId || !deviceKey) {
    return {
      ok: false,
      code: 'INVALID_TOKEN',
      message: 'Test launch link is invalid.',
    };
  }

  const ticket = tickets.get(token);
  if (!ticket) {
    return {
      ok: false,
      code: 'INVALID_TOKEN',
      message: 'This test launch link is invalid or corrupted.',
    };
  }

  if (ticket.expiresAt <= nowMs()) {
    tickets.delete(token);
    return {
      ok: false,
      code: 'EXPIRED_TOKEN',
      message: 'This test launch link has expired.',
    };
  }

  if (ticket.usedAt !== null) {
    return {
      ok: false,
      code: 'ALREADY_USED',
      message: 'This test launch link was already used.',
    };
  }

  if (ticket.testId !== testId || ticket.studentId !== studentId) {
    return {
      ok: false,
      code: 'USER_MISMATCH',
      message: 'This link does not match your test session.',
    };
  }

  const incomingDeviceHash = hash(deviceKey);
  if (incomingDeviceHash !== ticket.deviceKeyHash) {
    return {
      ok: false,
      code: 'DEVICE_MISMATCH',
      message: 'This link can only be opened on the original device.',
    };
  }

  if (ticket.userAgentHash !== hash(userAgent || 'unknown-ua')) {
    return {
      ok: false,
      code: 'DEVICE_MISMATCH',
      message: 'Device verification failed for this link.',
    };
  }

  ticket.usedAt = nowMs();
  tickets.set(token, ticket);

  return { ok: true };
}
