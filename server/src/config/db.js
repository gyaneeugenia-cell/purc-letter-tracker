import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;

export const pool = env.databaseUrl
  ? new Pool({
      connectionString: env.databaseUrl,
      max: 10,
      idleTimeoutMillis: 30000
    })
  : null;

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
