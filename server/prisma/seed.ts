import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  const kickoff = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h from now
  const matchDate = kickoff.toISOString().split('T')[0]; // YYYY-MM-DD

  // 1. Fixture
  const fixture = await prisma.fixture.upsert({
    where: { id: 99999 },
    update: { startingAt: kickoff },
    create: {
      id: 99999,
      name: 'Brazil vs Argentina',
      startingAt: kickoff,
      homeTeamName: 'Brazil',
      homeFlagUrl: 'https://flagcdn.com/w80/br.webp',
      awayTeamName: 'Argentina',
      awayFlagUrl: 'https://flagcdn.com/w80/ar.webp',
      homeScore: null,
      awayScore: null,
      status: 'NOT_STARTED',
      leagueId: 732,
      seasonId: 23723,
      stateId: 1,
      round: 'Group Stage - Matchday 1',
      aiPreview: 'The Oracle foresees a tactical battle in this Clásico del Plata.',
    },
  });

  // 2. OraclePrediction
  const oracle = await prisma.oraclePrediction.upsert({
    where: { fixtureId: 99999 },
    update: {},
    create: {
      fixtureId: 99999,
      homeScore: 1,
      awayScore: 2,
      confidencePercentage: 72,
      expectedGoalsHome: 1.23,
      expectedGoalsAway: 1.87,
      analyticalQuote: "Messi's creative playmaking gives Argentina the edge in this pulsating Clásico.",
      analyticalDriver: 'Form Index',
      simulationsRun: '1.4M',
      upsetProbability: 28,
      oracleVerdict: 'AWAY_WIN',
    },
  });

  // 3. Prediction
  const prediction = await prisma.prediction.upsert({
    where: { email_matchDate: { email: 'test.seed@ng.ab-inbev.com', matchDate } },
    update: {},
    create: {
      email: 'test.seed@ng.ab-inbev.com',
      name: 'Seed User',
      team: 'Team Budweiser',
      matchDate,
      fixtureId: 99999,
      guessHome: 1,
      guessAway: 1,
      firstScorer: 'Messi',
      processed: false,
    },
  });

  // 4. Leaderboard
  const leaderboard = await prisma.leaderboard.upsert({
    where: { email: 'test.seed@ng.ab-inbev.com' },
    update: {},
    create: {
      email: 'test.seed@ng.ab-inbev.com',
      name: 'Seed User',
      team: 'Team Budweiser',
      totalPoints: 70,
    },
  });

  // 5. JobQueue
  const job = await prisma.jobQueue.upsert({
    where: { fixtureId: 99999 },
    update: {},
    create: {
      fixtureId: 99999,
      processAt: new Date(kickoff.getTime() + 2 * 60 * 60 * 1000), // kickoff + 2h
      status: 'PENDING',
      retryCount: 0,
      metadata: {
        homeTeamName: 'Brazil',
        awayTeamName: 'Argentina',
        startingAt: kickoff.toISOString(),
      },
    },
  });

  console.log('Seed complete — 5 records created/verified');
  console.log(`  Fixture #${fixture.id}: ${fixture.name} @ ${kickoff.toISOString()}`);
  console.log(`  OraclePrediction: ${oracle.oracleVerdict} ${oracle.homeScore}-${oracle.awayScore} (${oracle.confidencePercentage}% confidence)`);
  console.log(`  Prediction: ${prediction.email} — matchDate ${prediction.matchDate}`);
  console.log(`  Leaderboard: ${leaderboard.name} — ${leaderboard.totalPoints}pts (${leaderboard.team})`);
  console.log(`  JobQueue: ${job.status} — processAt ${job.processAt.toISOString()}`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
