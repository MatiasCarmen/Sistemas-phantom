import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import apiRoutes from './server/routes';
import { db } from './server/dataStore';

async function startServer() {
  await db.initialize();

  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  // JSON & URL-encoded body parser
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // RESTful API endpoints mounted at /api
  app.use('/api', apiRoutes);

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ERP-Server] Sistema de Inventario y Ventas activo en http://localhost:${PORT}`);
  });

  const shutdown = () => {
    server.close(() => {
      void db.close();
    });
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

startServer().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[ERP-Server] No se pudo iniciar porque MongoDB no está disponible. Verifica MONGODB_URI y que la instancia esté activa. Detalle: ${message}`);
  process.exitCode = 1;
});
