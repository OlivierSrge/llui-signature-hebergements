import 'dotenv/config';
import app from './app.js';
import { db } from './db/connection.js';
import ocrWorker from './workers/ocrWorker.js';

const PORT = parseInt(process.env.PORT ?? '4000');

async function start(): Promise<void> {
  // Vérifier la connexion DB
  try {
    await db.query('SELECT 1');
    console.log('[DB] Connexion PostgreSQL établie');
  } catch (err) {
    console.error('[DB] Impossible de se connecter à PostgreSQL:', err);
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    console.log(`[Server] L&Lui Logistique API démarrée sur :${PORT}`);
    console.log(`[Server] Docs OpenAPI : http://localhost:${PORT}/api/docs`);
    console.log(`[Worker] OCR Worker actif (concurrency: 3)`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    console.log(`[Server] Signal ${signal} reçu — arrêt propre...`);
    server.close(async () => {
      await ocrWorker.close();
      await db.end();
      console.log('[Server] Arrêt complet');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}

start().catch((err) => {
  console.error('[Server] Erreur fatale au démarrage:', err);
  process.exit(1);
});
