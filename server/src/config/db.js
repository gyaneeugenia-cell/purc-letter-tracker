import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;

export const pool = env.databaseUrl
  ? new Pool({
      connectionString: env.databaseUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 8000
    })
  : null;

// Avoid an unhandled error event crashing the process if the DB drops.
if (pool) {
  pool.on('error', (err) => {
    console.error('[db] idle client error:', err.message);
  });
}

export async function query(text, params = []) {
  if (!pool) {
    throw new Error('DATABASE_URL is not configured');
  }

  return pool.query(text, params);
}

export async function databaseAvailable() {
  if (!pool) return false;
  try {
    await pool.query('select 1');
    return true;
  } catch {
    return false;
  }
}
