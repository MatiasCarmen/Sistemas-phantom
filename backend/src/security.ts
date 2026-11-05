import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const TOKEN_TTL_SECONDS = 8 * 60 * 60; // 8 horas
const MIN_SECRET_LENGTH = 32;
const sessions = new Map<string, { userId: string; exp: number }>();

function pruneSessions(): void {
  const now = Math.floor(Date.now() / 1000);
  for (const [id, session] of sessions) {
    if (session.exp <= now) sessions.delete(id);
  }
}

export function revokeUserSessions(userId: string): void {
  for (const [id, session] of sessions) {
    if (session.userId === userId) sessions.delete(id);
  }
}

export function revokeAllSessions(): void {
  sessions.clear();
}

export function revokeAuthToken(authHeader?: string): void {
  const verified = verifyAuthToken(authHeader);
  if (verified) sessions.delete(verified.sessionId);
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new Error(`JWT_SECRET debe estar configurado y tener al menos ${MIN_SECRET_LENGTH} caracteres`);
  }
  return secret;
}

export function assertSecurityConfig(): void {
  getJwtSecret();
}

export interface AuthTokenPayload {
  sub: string;
  username: string;
  role: string;
  iat: number;
  exp: number;
  jti: string;
}

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(input: string): string {
  const padLength = (4 - (input.length % 4)) % 4;
  const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(padLength);
  return Buffer.from(padded, 'base64').toString('utf8');
}

/**
 * Genera un hash seguro de contraseña usando scrypt con salt aleatorio.
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derivedKey}`;
}

export function isScryptPasswordHash(value: unknown): value is string {
  return typeof value === 'string' && /^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/i.test(value);
}

/**
 * Verifica una contraseña contra un hash scrypt (o texto plano heredado de datos demo).
 */
export function verifyPassword(passwordAttempt: unknown, storedPassword?: string | null): boolean {
  if (typeof passwordAttempt !== 'string' || !passwordAttempt || passwordAttempt.length > 1024 ||
      typeof storedPassword !== 'string' || !storedPassword || storedPassword.length > 1024) {
    return false;
  }
  if (storedPassword.startsWith('scrypt$')) {
    const [, salt, keyHex, extra] = storedPassword.split('$');
    if (extra !== undefined || !/^[a-f0-9]{32}$/i.test(salt || '') || !/^[a-f0-9]{128}$/i.test(keyHex || '')) {
      return false;
    }
    const derivedAttempt = scryptSync(passwordAttempt, salt, 64);
    const storedBuffer = Buffer.from(keyHex, 'hex');
    if (derivedAttempt.length !== storedBuffer.length) {
      return false;
    }
    return timingSafeEqual(derivedAttempt, storedBuffer);
  }
  scryptSync(passwordAttempt, 'phantom-legacy-comparison', 64);
  const legacyKey = createHash('sha256').update(storedPassword).digest();
  const attemptKey = createHash('sha256').update(passwordAttempt).digest();
  return timingSafeEqual(legacyKey, attemptKey);
}

/**
 * Firma un JSON Web Token (JWT) estándar con HMAC-SHA256.
 */
export function signAuthToken(user: { id: string; username: string; role: string }): string {
  pruneSessions();
  if (sessions.size >= 10000) throw new Error('Capacidad de sesiones agotada');
  const now = Math.floor(Date.now() / 1000);
  const jti = randomBytes(32).toString('hex');
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64UrlEncode(
    JSON.stringify({
      sub: user.id,
      username: user.username,
      role: user.role,
      iat: now,
      exp: now + TOKEN_TTL_SECONDS,
      jti,
    } satisfies AuthTokenPayload)
  );
  const signature = base64UrlEncode(
    createHmac('sha256', getJwtSecret()).update(`${header}.${payload}`).digest()
  );
  sessions.set(jti, { userId: user.id, exp: now + TOKEN_TTL_SECONDS });
  return `${header}.${payload}.${signature}`;
}

export function verifyAuthToken(authHeader?: string): { userId: string; role?: string; sessionId: string } | null {
  if (!authHeader || authHeader.length > 4096 || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const rawToken = authHeader.slice('Bearer '.length).trim();
  if (!rawToken) {
    return null;
  }

  const segments = rawToken.split('.');
  if (segments.length !== 3) {
    return null;
  }

  const [headerB64, payloadB64, signatureB64] = segments;
  const expectedSignature = base64UrlEncode(
    createHmac('sha256', getJwtSecret()).update(`${headerB64}.${payloadB64}`).digest()
  );

  const sigBuffer = Buffer.from(signatureB64);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const header = JSON.parse(base64UrlDecode(headerB64)) as { alg?: string };
    if (header.alg !== 'HS256') {
      return null;
    }
    const payload = JSON.parse(base64UrlDecode(payloadB64)) as AuthTokenPayload;
    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.sub !== 'string' || !payload.sub || !Number.isInteger(payload.exp) || payload.exp <= now ||
        !Number.isInteger(payload.iat) || payload.iat > now || typeof payload.jti !== 'string') {
      return null;
    }
    const session = sessions.get(payload.jti);
    if (!session || session.userId !== payload.sub || session.exp !== payload.exp) return null;
    return { userId: payload.sub, role: payload.role, sessionId: payload.jti };
  } catch {
    return null;
  }
}
