import { randomUUID } from 'crypto';
import type { Request, Response, NextFunction } from 'express';

export interface HttpError extends Error {
  statusCode?: number;
  status?: number;
  type?: string;
  expose?: boolean;
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada',
  });
}

// Errores del body-parser de Express: se traducen a mensajes propios sin detalles del parser
const parserErrors: Record<string, { status: number; message: string }> = {
  'entity.parse.failed': { status: 400, message: 'El cuerpo de la petición no es un JSON válido' },
  'entity.too.large': { status: 413, message: 'El cuerpo de la petición supera el tamaño permitido' },
  'encoding.unsupported': { status: 415, message: 'Codificación no soportada' },
  'charset.unsupported': { status: 415, message: 'Juego de caracteres no soportado' },
};

/**
 * OWASP A10: responde sin filtrar detalles internos. Los errores de cliente (4xx) definidos por la
 * aplicación conservan su mensaje; los 5xx devuelven un texto genérico y un identificador para
 * correlacionar con el log del servidor, donde sí queda el detalle completo.
 */
export function sendError(res: Response, error: unknown): void {
  const err = (error instanceof Error ? error : new Error(String(error))) as HttpError;
  const parserError = err.type ? parserErrors[err.type] : undefined;
  if (parserError) {
    res.status(parserError.status).json({ success: false, error: parserError.message });
    return;
  }

  const statusCode = err.statusCode ?? err.status;
  if (statusCode && statusCode >= 400 && statusCode < 500) {
    res.status(statusCode).json({ success: false, error: err.message });
    return;
  }

  const errorId = randomUUID();
  console.error(`[ERP-Backend Error] ${errorId}:`, err);
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor. Si el problema persiste, comunique este código al administrador.',
    errorId,
  });
}

export function errorHandler(
  err: HttpError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  sendError(res, err);
}
