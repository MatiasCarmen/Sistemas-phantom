import type { Request, Response, NextFunction } from 'express';
import { db } from '../dataStore';
import { verifyAuthToken } from '../security';
import { buildSecurityEvent } from '../audit';
import { saveAuditEvents } from '../mongo';
import type { User, UserPermissions } from '../types';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

/**
 * Resuelve el usuario dueño del token Bearer. Solo devuelve usuarios activos:
 * un usuario desactivado pierde el acceso aunque su token siga vigente.
 */
export function resolveAuthenticatedUser(req: Request): User | undefined {
  const verified = verifyAuthToken(req.headers.authorization);
  if (!verified) {
    return undefined;
  }
  const user = db.getUserById(verified.userId);
  if (!user || user.status !== 'active') {
    return undefined;
  }
  // OWASP A07: tokens emitidos antes de un logout o cambio de contraseña ya no son válidos
  if (verified.sessionVersion !== (user.sessionVersion ?? 0)) {
    return undefined;
  }
  return user;
}

/**
 * OWASP A01/A07: exige un JWT válido en cada petición (denegación por defecto).
 */
/** OWASP A09: registra en la bitácora un acceso rechazado (sin bloquear la respuesta). */
function logAccessDenied(req: Request, status: 401 | 403, reason: string): void {
  const actor = req.user ? { id: req.user.id, name: req.user.name } : { id: 'unknown', name: 'Token inválido o vencido' };
  void saveAuditEvents([buildSecurityEvent(req, 'access_denied', actor, req.user?.username || 'anónimo', { status, reason })])
    .catch((error) => console.error('[Audit] No se pudo registrar el acceso denegado:', error));
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const user = resolveAuthenticatedUser(req);
  if (!user) {
    // Solo se registran los intentos con token (inválido, vencido o revocado); sin token es simple navegación anónima
    if (req.headers.authorization) {
      logAccessDenied(req, 401, 'Token inválido, vencido o revocado');
    }
    res.status(401).json({ success: false, error: 'Sesión no válida o expirada' });
    return;
  }
  req.user = user;
  next();
}

export function hasPermission(user: User | undefined, permission: keyof UserPermissions): boolean {
  if (!user) {
    return false;
  }
  return user.role === 'admin' || user.permissions?.[permission] === true;
}

/**
 * OWASP A01: verifica en el servidor el permiso granular del usuario autenticado.
 */
export function requirePermission(permission: keyof UserPermissions) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!hasPermission(req.user, permission)) {
      logAccessDenied(req, 403, `Falta el permiso ${permission}`);
      res.status(403).json({ success: false, error: 'No tiene permisos para realizar esta acción' });
      return;
    }
    next();
  };
}

/**
 * OWASP A01: operaciones críticas (usuarios, respaldo/restauración, bitácora) reservadas al rol admin.
 * Se valida el rol y no el permiso para que un usuario con permisos delegados no pueda crear administradores.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'admin') {
    logAccessDenied(req, 403, 'Requiere rol administrador');
    res.status(403).json({ success: false, error: 'Solo los administradores pueden realizar esta acción' });
    return;
  }
  next();
}
