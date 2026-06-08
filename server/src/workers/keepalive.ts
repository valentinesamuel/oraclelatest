import { sql } from 'drizzle-orm';
import { db } from '../lib/db';
import { logger } from '../lib/logger';

const keepAliveLogger = logger.child({ service: 'keepalive' });
const INTERVAL_MS = 4 * 60 * 1000;

export function startKeepAlive(): void {
  keepAliveLogger.info({ intervalMs: INTERVAL_MS }, 'DB keepalive started');

  setInterval(async () => {
    try {
      await db.execute(sql`SELECT 1`);
      keepAliveLogger.info('DB keepalive ping OK');
    } catch (err) {
      keepAliveLogger.error({ err }, 'DB keepalive ping failed');
    }
  }, INTERVAL_MS);
}
