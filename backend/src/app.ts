import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import helmet from 'helmet';
import apiRoutes from './routes';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';

export function createApp(): Express {
  const app = express();
  // Detrás de un proxy inverso (Nginx, Vite preview, etc.) TRUST_PROXY permite obtener la IP real
  // del cliente para el rate limiting y la bitácora. Ej.: TRUST_PROXY=1 (un salto).
  if (process.env.TRUST_PROXY) {
    const hops = Number(process.env.TRUST_PROXY);
    app.set('trust proxy', Number.isInteger(hops) ? hops : process.env.TRUST_PROXY);
  }
  // OWASP A02: lista blanca de orígenes (FRONTEND_URL admite varios separados por coma)
  const allowedOrigins = new Set(
    (process.env.FRONTEND_URL || 'http://localhost:5173')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
  );

  // OWASP A02: cabeceras de seguridad (nosniff, frameguard, HSTS, CSP restrictiva para respuestas JSON)
  // y sin X-Powered-By. La API no sirve HTML, por eso la CSP puede negar todo.
  app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
    },
  }));
  app.use('/api', (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  // Middleware CORS: solo se refleja el origen si está en la lista blanca
  app.use((req: Request, res: Response, next: NextFunction) => {
    const requestOrigin = req.headers.origin;
    if (requestOrigin && allowedOrigins.has(requestOrigin)) {
      res.setHeader('Access-Control-Allow-Origin', requestOrigin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }

    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  // Body parser JSON con límite acotado (la restauración de respaldos admite un archivo mayor)
  app.use('/api/system/import', express.json({ limit: '5mb' }));
  app.use(express.json({ limit: '1mb' }));

  // Endpoints RESTful montados bajo /api
  app.use('/api', apiRoutes);

  // Manejo de rutas inexistentes y errores globales
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
