import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const TOKEN_TTL_SECONDS = 8 * 60 * 60; // 8 horas
const MIN_SECRET_LENGTH = 32;

/**
 * OWASP A02/A04: el secreto de firma JWT es obligatorio y no tiene valor por defecto en el código.
 * Se lee en cada uso para que server.ts pueda validarlo al arrancar (después de cargar .env).
 */
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET no está configurado o tiene menos de ${MIN_SECRET_LENGTH} caracteres. ` +
      'Genere uno con: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64url\'))"'
    );
  }
  return secret;
}

export function assertSecurityConfig(): void {
  getJwtSecret();
}

/** Clave HMAC de la bitácora (AUDIT_HMAC_SECRET o, en su defecto, JWT_SECRET). */
export function getAuditHmacKey(): string {
  return process.env.AUDIT_HMAC_SECRET || getJwtSecret();
}

export interface AuthTokenPayload {
  sub: string;
  username: string;
  role: string;
  sv: number;
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
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derivedKey}`;
}

/**
 * Verifica una contraseña contra un hash scrypt.
 * Falla cerrado: un usuario sin contraseña registrada nunca se autentica.
 */
export function verifyPassword(passwordAttempt: string, storedPassword?: string): boolean {
  if (!storedPassword || !passwordAttempt) {
    return false;
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
  // Las contraseñas en texto plano se migran a scrypt al iniciar; cualquier otro formato se rechaza
  return false;
}

/**
 * Firma un JSON Web Token (JWT) estándar con HMAC-SHA256.
 */
export function signAuthToken(user: { id: string; username: string; role: string; sessionVersion?: number }): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64UrlEncode(
    JSON.stringify({
      sub: user.id,
      username: user.username,
      role: user.role,
      sv: user.sessionVersion ?? 0,
      iat: now,
      exp: now + TOKEN_TTL_SECONDS,
    } satisfies AuthTokenPayload)
  );
  const signature = base64UrlEncode(
    createHmac('sha256', getJwtSecret()).update(`${header}.${payload}`).digest()
  );
  return `${header}.${payload}.${signature}`;
}

/**
 * Política mínima de contraseñas (OWASP A07): 8+ caracteres con letras y números.
 * Devuelve el motivo del rechazo o null si la contraseña es aceptable.
 */
export function validatePasswordPolicy(password: unknown): string | null {
  if (typeof password !== 'string' || password.length < 8) {
    return 'La contraseña debe tener al menos 8 caracteres';
  }
  if (password.length > 128) {
    return 'La contraseña no puede superar los 128 caracteres';
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'La contraseña debe combinar letras y números';
  }
  return null;
}

/**
 * Verifica un encabezado Authorization Bearer con un JWT HS256 firmado por este servidor.
 */
export function verifyAuthToken(authHeader?: string): { userId: string; role?: string; sessionVersion: number } | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
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
    if (!payload.sub || typeof payload.exp !== 'number' || payload.exp < now || typeof payload.sv !== 'number') {
      return null;
    }
    return { userId: payload.sub, role: payload.role, sessionVersion: payload.sv };
  } catch {
    return null;
  }
}
