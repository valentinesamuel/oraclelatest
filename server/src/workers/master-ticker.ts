import { sql } from 'drizzle-orm';
import { db } from '../lib/db';
import { startMatchPoller } from './match-poller';
import { tickerLogger } from '../lib/logger';

// const TICK_INTERVAL_MS = 30_000;
const TICK_INTERVAL_MS = 1000;
const MAX_CONCURRENT_JOBS = 2;

let activeJobsCount = 0;

export function startMasterTicker(): void {
  tickerLogger.info({ intervalMs: TICK_INTERVAL_MS, maxConcurrent: MAX_CONCURRENT_JOBS }, 'Master ticker started');

  setInterval(async () => {
    if (activeJobsCount >= MAX_CONCURRENT_JOBS) {
      tickerLogger.debug({ active: activeJobsCount, max: MAX_CONCURRENT_JOBS }, 'Tick skipped: at capacity');
      return;
    }

    try {
      const result = await db.execute(sql`
        UPDATE "JobQueue"
        SET status = 'RUNNING', "updatedAt" = NOW()
        WHERE id = (
          SELECT id FROM "JobQueue"
          WHERE status = 'PENDING' AND "processAt" <= NOW()
          ORDER BY "processAt" ASC
          LIMIT 1
          FOR UPDATE SKIP LOCKED
        )
        RETURNING id, "fixtureId"
      `);

      if (!result.rows || result.rows.length === 0) return;

      const job = result.rows[0] as { id: number; fixtureId: number };
      activeJobsCount++;
      tickerLogger.info({ jobId: job.id, fixtureId: job.fixtureId, active: activeJobsCount }, 'Job claimed');

      startMatchPoller(job.fixtureId, () => {
        activeJobsCount--;
        tickerLogger.info({ jobId: job.id, active: activeJobsCount }, 'Job completed');
      });
    } catch (err) {
      tickerLogger.error({ err }, 'Tick cycle error');
    }
  }, TICK_INTERVAL_MS);
}
