import rateLimit from 'express-rate-limit';

/**
 * OWASP A07: protección contra fuerza bruta y relleno de credenciales.
 *  1. Límite por IP: 20 intentos fallidos cada 15 minutos (los logins correctos no cuentan).
 *  2. Bloqueo por cuenta: 5 fallos seguidos bloquean ese usuario 15 minutos, aunque el atacante cambie de IP.
 * Ambos responden 429 con un mensaje genérico. El estado vive en memoria (se reinicia con el servidor).
 */

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES_PER_ACCOUNT = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

export const loginRateLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: 20,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: 'Demasiados intentos de inicio de sesión. Intente nuevamente en unos minutos.' },
});

interface FailureRecord {
  count: number;
  lockedUntil: number;
}

const failuresByAccount = new Map<string, FailureRecord>();

function accountKey(identifier: string): string {
  return identifier.trim().toLowerCase();
}

/** Devuelve los segundos restantes de bloqueo, o 0 si la cuenta puede intentar iniciar sesión. */
export function getLockoutSeconds(identifier: string): number {
  const record = failuresByAccount.get(accountKey(identifier));
  if (!record || record.lockedUntil <= Date.now()) {
    return 0;
  }
  return Math.ceil((record.lockedUntil - Date.now()) / 1000);
}

/** Registra un fallo y devuelve true si la cuenta acaba de quedar bloqueada. */
export function registerLoginFailure(identifier: string): boolean {
  const key = accountKey(identifier);
  const now = Date.now();
  const previous = failuresByAccount.get(key);
  const count = previous && previous.lockedUntil <= now && previous.count >= MAX_FAILURES_PER_ACCOUNT
    ? 1
    : (previous?.count || 0) + 1;
  const lockedUntil = count >= MAX_FAILURES_PER_ACCOUNT ? now + LOCKOUT_MS : 0;
  failuresByAccount.set(key, { count, lockedUntil });

  // Limpieza simple para que el mapa no crezca sin límite
  if (failuresByAccount.size > 10_000) {
    for (const [storedKey, record] of failuresByAccount) {
      if (record.lockedUntil <= now) failuresByAccount.delete(storedKey);
    }
  }
  return lockedUntil > 0;
}

export function clearLoginFailures(identifier: string): void {
  failuresByAccount.delete(accountKey(identifier));
}
