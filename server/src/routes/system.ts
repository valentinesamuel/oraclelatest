import { Router, Request } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../lib/db';
import { jobQueue } from '../db/schema';
import { runDailySync } from '../crons/midnight-sync';
import { systemLogger } from '../lib/logger';

export const systemRouter = Router();

systemRouter.post('/recover-state', async (_req, res) => {
  try {
    const updated = await db
      .update(jobQueue)
      .set({ status: 'PENDING', updatedAt: new Date() })
      .where(eq(jobQueue.status, 'RUNNING'))
      .returning({ id: jobQueue.id });
    systemLogger.info({ recovered: updated.length }, 'State recovery complete');
    res.json({ recovered: updated.length });
  } catch {
    res.status(500).json({ error: 'Recovery failed' });
  }
});

systemRouter.post('/sync-day', async (req: Request, res) => {
  systemLogger.debug({ triggeredBy: 'manual' }, 'Manual sync-day triggered');
  try {
    const result = await runDailySync('manual', (req as any).id as string | undefined);
    res.json(result);
  } catch (err) {
    systemLogger.error({ err }, 'Manual sync-day trigger failed');
    res.status(500).json({ error: 'Sync failed' });
  }
});
