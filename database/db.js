import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import pg from 'pg';

const { Pool } = pg;
const directory = dirname(fileURLToPath(import.meta.url));
const connectionString = process.env.DATABASE_URL;
const useTls = process.env.DATABASE_SSL === 'true';

export const pool = connectionString ? new Pool({
  connectionString,
  max: Number(process.env.DATABASE_POOL_MAX) || 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ...(useTls ? { ssl: { rejectUnauthorized: true } } : {}),
}) : null;

export async function initializeDatabase() {
  if (!pool) return false;
  const schema = await readFile(resolve(directory, 'schema.sql'), 'utf8');
  await pool.query(schema);
  return true;
}
