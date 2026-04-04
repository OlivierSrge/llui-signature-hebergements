import 'dotenv/config';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import app from './app.js';
import { db } from './db/connection.js';
import ocrWorker from './workers/ocrWorker.js';

const PORT = parseInt(process.env.PORT ?? '4000');
const __dirname = dirname(fileURLToPath(import.meta.url));

async function runMigrations(): Promise<void> {
  const client = await db.getClient();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename   TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    const migrationsDir = join(__dirname, 'db', 'migrations');
    const { readdir } = await import('fs/promises');
    const files = (await readdir(migrationsDir))
      .filter((f) => f.endsWith('.sql'))
      .sort();
    const { rows } = await client.query<{ filename: string }>(
      'SELECT filename FROM schema_migrations',
    );
    const applied = new Set(rows.map((r) => r.filename));
    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = await readFile(join(migrationsDir, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`[Migrate] ✅ ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }
  } finally {
    client.release();
  }
}

async function start(): Promise<void> {
  // Vérifier la connexion DB
  try {
    await db.query('SELECT 1');
    console.log('[DB] Connexion PostgreSQL établie');
  } catch (err) {
    console.error('[DB] Impossible de se connecter à PostgreSQL:', err);
    process.exit(1);
  }

  // Migrations automatiques au démarrage (idempotent)
  try {
    await runMigrations();
  } catch (err) {
    console.error('[Migrate] Erreur migration:', err);
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
