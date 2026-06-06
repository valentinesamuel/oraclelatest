import { Router, Request } from 'express';
import { prisma } from '../lib/prisma';
import { runDailySync } from '../crons/midnight-sync';
import { systemLogger } from '../lib/logger';

export const systemRouter = Router();

systemRouter.post('/recover-state', async (_req, res) => {
  try {
    const result = await prisma.jobQueue.updateMany({
      where: { status: 'RUNNING' },
      data: { status: 'PENDING' },
    });
    systemLogger.info({ recovered: result.count }, 'State recovery complete');
    res.json({ recovered: result.count });
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
