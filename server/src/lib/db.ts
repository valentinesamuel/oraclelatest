import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { logger } from './logger';

const dbLogger = logger.child({ service: 'db' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => {
  dbLogger.error({ err }, 'Idle pool client error');
});

export const db = drizzle(pool, { schema });
