import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import apiRoutes from './routes';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { loginRateLimit } from './loginRateLimit';

export function createApp(): Express {
  const app = express();
  const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
  app.use('/api/auth/login', loginRateLimit());

  // Middleware CORS nativo tipado
  app.use((req: Request, res: Response, next: NextFunction) => {
    const requestOrigin = req.headers.origin;
    if (requestOrigin === allowedOrigin) {
      res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    } else if (!requestOrigin) {
      res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  // Body parsers JSON y URL-encoded
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Endpoints RESTful montados bajo /api
  app.use('/api', apiRoutes);

  // Manejo de rutas inexistentes y errores globales
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
