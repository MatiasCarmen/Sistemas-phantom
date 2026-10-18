import type { Request, Response, NextFunction } from 'express';

export interface HttpError extends Error {
  statusCode?: number;
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
  });
}

export function errorHandler(
  err: HttpError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;
  const message = err.message || 'Error interno del servidor';
  console.error(`[ERP-Backend Error] ${statusCode}: ${message}`);
  res.status(statusCode).json({
    success: false,
    error: message,
  });
}
