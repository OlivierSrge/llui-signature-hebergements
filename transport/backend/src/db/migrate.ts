/**
 * Script de migration autonome.
 * Usage : npm run migrate
 * Exécute les fichiers SQL dans l'ordre alphabétique depuis migrations/
 */
import 'dotenv/config';
import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { db } from './connection.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, 'migrations');

async function migrate(): Promise<void> {
  const client = await db.getClient();

  try {
    // Créer la table de suivi des migrations si elle n'existe pas
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename  TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Lire et trier les fichiers de migration
    const files = (await readdir(MIGRATIONS_DIR))
      .filter((f) => f.endsWith('.sql'))
      .sort();

    // Récupérer les migrations déjà appliquées
    const appliedResult = await client.query<{ filename: string }>(
      'SELECT filename FROM schema_migrations',
    );
    const applied = new Set(appliedResult.rows.map((r) => r.filename));

    let applied_count = 0;

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`[Migrate] ✓ ${file} (déjà appliqué)`);
        continue;
      }

      const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [file],
        );
        await client.query('COMMIT');
        console.log(`[Migrate] ✅ ${file} appliqué`);
        applied_count++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[Migrate] ❌ Échec sur ${file}:`, err);
        throw err;
      }
    }

    if (applied_count === 0) {
      console.log('[Migrate] Base de données à jour — aucune migration à appliquer');
    } else {
      console.log(`[Migrate] ${applied_count} migration(s) appliquée(s) avec succès`);
    }
  } finally {
    client.release();
    await db.end();
  }
}

migrate().catch((err) => {
  console.error('[Migrate] Erreur fatale:', err);
  process.exit(1);
});
