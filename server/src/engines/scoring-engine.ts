import { prisma } from "../lib/prisma";
import { calculatePoints } from "../utils/scoring";
import {
  fetchFixtureWithEvents,
  extractFirstScorer,
  SportmonksNotFoundError,
  SportmonksFixture,
  TERMINAL_STATE_IDS,
} from "../lib/sportmonks";
import { scoringLogger } from "../lib/logger";

const BATCH_SIZE = 500;
const BATCH_SLEEP_MS = 100;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runScoringEngine(fixtureId: number): Promise<void> {
  const log = scoringLogger.child({ fixtureId });
  const startTime = Date.now();

  let rawFixture: SportmonksFixture;
  try {
    const res = await fetchFixtureWithEvents(fixtureId);
    rawFixture = res.data;
  } catch (err) {
    if (err instanceof SportmonksNotFoundError) {
      log.error(
        { err, fixtureId, apiMessage: err.apiMessage },
        "Cannot score — fixture not found / not in subscription",
      );
      return;
    }
    throw err;
  }

  if (!TERMINAL_STATE_IDS.includes(rawFixture.state_id)) {
    log.warn(
      { stateId: rawFixture.state_id },
      "Fixture not terminal, aborting scoring",
    );
    return;
  }

  const events = rawFixture.events ?? [];
  const goalEvents = events.filter((e) => [14, 16].includes(e.type_id));
  const lastGoal = [...goalEvents].sort((a, b) => b.minute - a.minute)[0];

  let actualHome = 0;
  let actualAway = 0;
  if (lastGoal?.result) {
    const parts = lastGoal.result.split("-");
    if (parts.length === 2) {
      actualHome = parseInt(parts[0], 10) || 0;
      actualAway = parseInt(parts[1], 10) || 0;
    }
  }

  const actualFirstScorer = extractFirstScorer(events);
  log.info(
    { actualHome, actualAway, actualFirstScorer },
    "Fixture result resolved",
  );

  let processedTotal = 0;
  while (true) {
    const batch = await prisma.prediction.findMany({
      where: { fixtureId, processed: false },
      take: BATCH_SIZE,
    });
    if (batch.length === 0) break;

    await prisma.$transaction(async (tx) => {
      for (const pred of batch) {
        const points = calculatePoints({
          guessHome: pred.guessHome,
          guessAway: pred.guessAway,
          actualHome,
          actualAway,
          firstScorerGuess: pred.firstScorer,
          actualFirstScorer,
        });

        await tx.prediction.update({
          where: { id: pred.id },
          data: {
            processed: true,
            exactScorePoints: points.exactScorePoints,
            correctWinnerPoints: points.correctWinnerPoints,
            firstScorerPoints: points.firstScorerPoints,
            totalPoints: points.totalPoints,
          },
        });

        await tx.leaderboard.upsert({
          where: { email: pred.email },
          create: {
            email: pred.email,
            name: pred.name,
            team: pred.team,
            totalPoints: points.totalPoints,
          },
          update: {
            totalPoints: { increment: points.totalPoints },
            name: pred.name,
            team: pred.team,
          },
        });
      }
    });

    processedTotal += batch.length;
    log.debug({ batchSize: batch.length, processedTotal }, "Batch scored");
    await sleep(BATCH_SLEEP_MS);
  }

  await prisma.fixture.update({
    where: { id: fixtureId },
    data: {
      status: "FINISHED",
      homeScore: actualHome,
      awayScore: actualAway,
      stateId: rawFixture.state_id,
    },
  });

  await prisma.jobQueue.update({
    where: { fixtureId },
    data: { status: "COMPLETED" },
  });

  log.info(
    { processedTotal, durationMs: Date.now() - startTime },
    "Scoring complete",
  );
}
