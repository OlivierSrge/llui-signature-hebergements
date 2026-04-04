import { Pool, PoolClient } from 'pg';

const pool = new Pool({
  host:     process.env.DB_HOST     ?? 'localhost',
  port:     parseInt(process.env.DB_PORT ?? '5432'),
  database: process.env.DB_NAME     ?? 'llui_transport',
  user:     process.env.DB_USER     ?? 'llui',
  password: process.env.DB_PASSWORD ?? '',
  max:      parseInt(process.env.DB_POOL_MAX ?? '20'),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client:', err);
});

export const db = {
  query: <T = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ) => pool.query<T>(text, params),

  getClient: (): Promise<PoolClient> => pool.connect(),

  /** Exécute une fonction dans une transaction ; rollback automatique si erreur */
  transaction: async <T>(
    fn: (client: PoolClient) => Promise<T>,
  ): Promise<T> => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  end: () => pool.end(),
};

export type { PoolClient };
