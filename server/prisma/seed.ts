import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { fixture, oraclePrediction, prediction, leaderboard, jobQueue } from '../src/db/schema';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function main() {
  const now = new Date();
  const kickoff = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h from now
  const matchDate = kickoff.toISOString().split('T')[0]; // YYYY-MM-DD

  // 1. Fixture
  const [fix] = await db.insert(fixture).values({
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
  }).onConflictDoUpdate({
    target: fixture.id,
    set: { startingAt: kickoff },
  }).returning();

  // 2. OraclePrediction
  const [oracle] = await db.insert(oraclePrediction).values({
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
  }).onConflictDoNothing().returning();

  const oracleRow = oracle ?? (await db.select().from(oraclePrediction).where(eq(oraclePrediction.fixtureId, 99999)).limit(1))[0];

  // 3. Prediction
  const [pred] = await db.insert(prediction).values({
    email: 'test.seed@ng.ab-inbev.com',
    name: 'Seed User',
    team: 'Team Budweiser',
    matchDate,
    fixtureId: 99999,
    guessHome: 1,
    guessAway: 1,
    firstScorer: 'Messi',
    processed: false,
  }).onConflictDoNothing().returning();

  const predRow = pred ?? (await db.select().from(prediction).where(eq(prediction.email, 'test.seed@ng.ab-inbev.com')).limit(1))[0];

  // 4. Leaderboard
  const [lb] = await db.insert(leaderboard).values({
    email: 'test.seed@ng.ab-inbev.com',
    name: 'Seed User',
    team: 'Team Budweiser',
    totalPoints: 70,
    updatedAt: new Date(),
  }).onConflictDoNothing().returning();

  const lbRow = lb ?? (await db.select().from(leaderboard).where(eq(leaderboard.email, 'test.seed@ng.ab-inbev.com')).limit(1))[0];

  // 5. JobQueue
  const [job] = await db.insert(jobQueue).values({
    fixtureId: 99999,
    processAt: new Date(kickoff.getTime() + 2 * 60 * 60 * 1000), // kickoff + 2h
    status: 'PENDING',
    retryCount: 0,
    updatedAt: new Date(),
    metadata: {
      homeTeamName: 'Brazil',
      awayTeamName: 'Argentina',
      startingAt: kickoff.toISOString(),
    },
  }).onConflictDoNothing().returning();

  const jobRow = job ?? (await db.select().from(jobQueue).where(eq(jobQueue.fixtureId, 99999)).limit(1))[0];

  console.log('Seed complete — 5 records created/verified');
  console.log(`  Fixture #${fix.id}: ${fix.name} @ ${kickoff.toISOString()}`);
  console.log(`  OraclePrediction: ${oracleRow.oracleVerdict} ${oracleRow.homeScore}-${oracleRow.awayScore} (${oracleRow.confidencePercentage}% confidence)`);
  console.log(`  Prediction: ${predRow.email} — matchDate ${predRow.matchDate}`);
  console.log(`  Leaderboard: ${lbRow.name} — ${lbRow.totalPoints}pts (${lbRow.team})`);
  console.log(`  JobQueue: ${jobRow.status} — processAt ${jobRow.processAt.toISOString()}`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => pool.end());
