import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/prisma';
import { buildEmail, validateEmailDomain } from '../utils/email';
import { predictionsLogger } from '../lib/logger';

export const predictionsRouter = Router();

const globalLimiter = rateLimit({
  windowMs: 60_000,
  limit: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Try again in a minute.' },
});

const perEmailLimiter = rateLimit({
  windowMs: 60_000,
  limit: 3,
  keyGenerator: (req: Request) => {
    const body = req.body as { emailPrefix?: string };
    return (body.emailPrefix ?? req.ip ?? 'unknown').toLowerCase().trim();
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many prediction attempts. Wait a minute before retrying.' },
});

interface PredictionBody {
  emailPrefix: string;
  name: string;
  team: string;
  fixtureId: number;
  guessHome: number;
  guessAway: number;
  firstScorer?: string;
}

const VALID_TEAMS = ['Team Budweiser', 'Team Trophy'];

predictionsRouter.post('/', globalLimiter, perEmailLimiter, async (req: Request, res: Response): Promise<void> => {
  const body = req.body as PredictionBody;

  const email = buildEmail(body.emailPrefix ?? '');
  if (!validateEmailDomain(email)) {
    res.status(400).json({ error: 'Invalid email format. Must be yourname@ng.ab-inbev.com' });
    return;
  }

  const name = (body.name ?? '').trim();
  if (!name) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }

  if (!VALID_TEAMS.includes(body.team)) {
    res.status(400).json({ error: 'Team must be Team Budweiser or Team Trophy' });
    return;
  }

  const guessHome = Number(body.guessHome);
  const guessAway = Number(body.guessAway);
  if (
    !Number.isInteger(guessHome) || guessHome < 0 || guessHome > 9 ||
    !Number.isInteger(guessAway) || guessAway < 0 || guessAway > 9
  ) {
    res.status(400).json({ error: 'Scores must be integers between 0 and 9' });
    return;
  }

  const fixture = await prisma.fixture.findUnique({
    where: { id: Number(body.fixtureId) },
  });
  if (!fixture) {
    res.status(404).json({ error: 'Fixture not found' });
    return;
  }

  if (Date.now() >= fixture.startingAt.getTime()) {
    res.status(403).json({ error: 'Prediction window closed. Match has already kicked off.' });
    return;
  }

  const matchDate = fixture.startingAt.toISOString().slice(0, 10);

  const existing = await prisma.prediction.findUnique({
    where: { email_matchDate: { email, matchDate } },
  });
  if (existing) {
    res.status(400).json({ error: 'You have already submitted a prediction for this date.' });
    return;
  }

  try {
    await prisma.prediction.create({
      data: {
        email,
        name,
        team: body.team,
        matchDate,
        fixtureId: fixture.id,
        guessHome,
        guessAway,
        firstScorer: (body.firstScorer ?? '').trim(),
      },
    });
    res.status(200).json({ message: 'Prediction saved' });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('Unique constraint')) {
      res.status(400).json({ error: 'You have already submitted a prediction for this date.' });
      return;
    }
    predictionsLogger.error({ err, email, fixtureId: fixture.id }, 'Prediction insert failed');
    res.status(500).json({ error: 'Internal server error' });
  }
});
