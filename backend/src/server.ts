import 'dotenv/config';
import { createApp } from './app';
import { db } from './dataStore';

async function startServer() {
  await db.initialize();

  const app = createApp();
  const PORT = Number(process.env.PORT || 3000);

  const server = app.listen(PORT, '0.0.0.0', () => {
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

startServer().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[ERP-Backend] Error al iniciar el servidor: ${message}`);
  process.exitCode = 1;
});
