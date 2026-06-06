import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: ['req.headers.authorization', 'req.body.password'],
    censor: '[REDACTED]',
  },
});

export const bootstrapLogger   = logger.child({ service: 'bootstrap' });
export const serverLogger      = logger.child({ service: 'server' });
export const authLogger        = logger.child({ service: 'auth' });
export const healthLogger      = logger.child({ service: 'health' });
export const systemLogger      = logger.child({ service: 'system' });
export const predictionsLogger = logger.child({ service: 'predictions' });
export const tickerLogger      = logger.child({ service: 'ticker' });
export const pollerLogger      = logger.child({ service: 'poller' });
export const syncLogger        = logger.child({ service: 'sync' });
export const scoringLogger     = logger.child({ service: 'scoring' });
export const claudeLogger      = logger.child({ service: 'claude' });
export const sportmonksLogger  = logger.child({ service: 'sportmonks' });
