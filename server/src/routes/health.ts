import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { healthLogger } from '../lib/logger';

export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  const mem = process.memoryUsage();
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      memoryMB: Math.round(mem.heapUsed / 1024 / 1024),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    healthLogger.error({ err }, 'Database ping failed');
    res.status(503).json({ status: 'db_error' });
  }
});
