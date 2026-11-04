import 'dotenv/config';
import { createApp } from './app';
import { db } from './dataStore';
import { assertSecurityConfig } from './security';

async function startServer() {
  // Falla cerrado: sin un JWT_SECRET robusto el servidor no arranca
  assertSecurityConfig();
  await db.initialize();

  const app = createApp();
  const PORT = Number(process.env.PORT || 3000);
  const HOST = process.env.HOST || '0.0.0.0';

  const server = app.listen(PORT, HOST, () => {
    console.log(`[ERP-Backend] Sistema de Inventario y Ventas activo en http://localhost:${PORT}`);
    console.log(`[ERP-Backend] Health check disponible en http://localhost:${PORT}/api/health`);
  });

  const shutdown = () => {
    server.close(() => {
      void db.close();
    });
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

// OWASP A10: una promesa rechazada sin manejar se registra en vez de pasar desapercibida
process.on('unhandledRejection', (reason) => {
  console.error('[ERP-Backend] Promesa rechazada sin manejar:', reason);
});

startServer().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[ERP-Backend] Error al iniciar el servidor: ${message}`);
  process.exitCode = 1;
});
