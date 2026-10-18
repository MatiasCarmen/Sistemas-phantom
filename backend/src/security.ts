import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'phantom_erp_hmac_secret_key_2026_secure';
const TOKEN_TTL_SECONDS = 8 * 60 * 60; // 8 horas

export interface AuthTokenPayload {
  sub: string;
  username: string;
  role: string;
  iat: number;
  exp: number;
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
  if (password.startsWith('scrypt$')) {
    return password;
  }
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derivedKey}`;
}

/**
 * Verifica una contraseña contra un hash scrypt (o texto plano heredado de datos demo).
 */
export function verifyPassword(passwordAttempt: string, storedPassword?: string): boolean {
  if (!storedPassword) {
    return true;
  }
  if (storedPassword.startsWith('scrypt$')) {
    const [, salt, keyHex] = storedPassword.split('$');
    if (!salt || !keyHex) {
      return false;
    }
    const derivedAttempt = scryptSync(passwordAttempt, salt, 64);
    const storedBuffer = Buffer.from(keyHex, 'hex');
    if (derivedAttempt.length !== storedBuffer.length) {
      return false;
    }
    return timingSafeEqual(derivedAttempt, storedBuffer);
  }
  return storedPassword === passwordAttempt;
}

/**
 * Firma un JSON Web Token (JWT) estándar con HMAC-SHA256.
 */
export function signAuthToken(user: { id: string; username: string; role: string }): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64UrlEncode(
    JSON.stringify({
      sub: user.id,
      username: user.username,
      role: user.role,
      iat: now,
      exp: now + TOKEN_TTL_SECONDS,
    } satisfies AuthTokenPayload)
  );
  const signature = base64UrlEncode(
    createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest()
  );
  return `${header}.${payload}.${signature}`;
}

/**
 * Verifica un encabezado Authorization Bearer (soporta JWT firmado y tokens legacy de sesión).
 */
export function verifyAuthToken(authHeader?: string): { userId: string; role?: string } | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const rawToken = authHeader.slice('Bearer '.length).trim();
  if (!rawToken) {
    return null;
  }

  // Compatibilidad con formato legacy token_<userId>_<timestamp> si existiera en localStorage
  if (rawToken.startsWith('token_')) {
    const parts = rawToken.replace('token_', '').split('_');
    if (parts[0]) {
      return { userId: parts[0] };
    }
    return null;
  }

  const segments = rawToken.split('.');
  if (segments.length !== 3) {
    return null;
  }

  const [headerB64, payloadB64, signatureB64] = segments;
  const expectedSignature = base64UrlEncode(
    createHmac('sha256', JWT_SECRET).update(`${headerB64}.${payloadB64}`).digest()
  );

  const sigBuffer = Buffer.from(signatureB64);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(payloadB64)) as AuthTokenPayload;
    const now = Math.floor(Date.now() / 1000);
    if (!payload.sub || (payload.exp && payload.exp < now)) {
      return null;
    }
    return { userId: payload.sub, role: payload.role };
  } catch {
    return null;
  }
}
