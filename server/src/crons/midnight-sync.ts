import cron from "node-cron";
import { prisma } from "../lib/prisma";
import { fetchFixturesForDate } from "../lib/sportmonks";
import { generateOraclePrediction } from "../lib/claude";
import { syncLogger } from "../lib/logger";
import { formatDate } from "../utils/date";

const PROCESS_AT_OFFSET_MS = 120 * 60 * 1000;

export async function runDailySync(
  triggeredBy: "cron" | "manual" = "cron",
  requestId?: string,
): Promise<{ fixtures: number; jobs: number }> {
  const today = formatDate(new Date("2022-12-18"));
  const log = syncLogger.child({
    triggeredBy,
    ...(requestId ? { requestId } : {}),
  });
  const startTime = Date.now();

  log.info({ date: today }, "Daily sync started");

  const fixtures = await fetchFixturesForDate(today);
  let fixtureCount = 0;
  let jobCount = 0;

  for (const f of fixtures) {
    await prisma.fixture.upsert({
      where: { id: f.id },
      create: {
        id: f.id,
        name: f.name,
        startingAt: f.startingAt,
        homeTeamName: f.homeTeamName,
        homeFlagUrl: f.homeFlagUrl,
        awayTeamName: f.awayTeamName,
        awayFlagUrl: f.awayFlagUrl,
        leagueId: f.leagueId,
        seasonId: f.seasonId,
        stateId: f.stateId,
        round: f.round,
        status: f.status as any,
        rawSportmonksData: f.rawSportmonksData as any,
      },
      update: {
        name: f.name,
        startingAt: f.startingAt,
        stateId: f.stateId,
        status: f.status as any,
        rawSportmonksData: f.rawSportmonksData as any,
      },
    });
    fixtureCount++;

    const oracleExists = await prisma.oraclePrediction.findUnique({
      where: { fixtureId: f.id },
    });
    if (!oracleExists) {
      const oracle = await generateOraclePrediction(
        f.homeTeamName,
        f.awayTeamName,
      );
      await prisma.oraclePrediction.create({
        data: {
          fixtureId: f.id,
          homeScore: oracle.homeScore,
          awayScore: oracle.awayScore,
          confidencePercentage: oracle.confidencePercentage,
          expectedGoalsHome: oracle.expectedGoalsHome,
          expectedGoalsAway: oracle.expectedGoalsAway,
          analyticalQuote: oracle.analyticalQuote,
          analyticalDriver: oracle.analyticalDriver,
          simulationsRun: oracle.simulationsRun,
          upsetProbability: oracle.upsetProbability,
          oracleVerdict: oracle.oracleVerdict,
        },
      });
      await prisma.fixture.update({
        where: { id: f.id },
        data: { aiPreview: oracle.analyticalQuote },
      });
      log.info(
        {
          fixtureId: f.id,
          verdict: oracle.oracleVerdict,
          confidence: oracle.confidencePercentage,
        },
        "Oracle prediction generated",
      );
    } else {
      log.debug(
        { fixtureId: f.id },
        "Oracle prediction already exists, skipping",
      );
    }

    const processAt = new Date(
      f.kickoffTimestamp * 1000 + PROCESS_AT_OFFSET_MS,
    );
    const existing = await prisma.jobQueue.findUnique({
      where: { fixtureId: f.id },
    });
    if (!existing) {
      await prisma.jobQueue.create({
        data: {
          fixtureId: f.id,
          processAt,
          status: "PENDING",
          metadata: {
            homeTeamName: f.homeTeamName,
            awayTeamName: f.awayTeamName,
            homeFlagUrl: f.homeFlagUrl,
            awayFlagUrl: f.awayFlagUrl,
            kickoffTimestamp: f.kickoffTimestamp,
            startingAt: f.startingAt.toISOString(),
            leagueId: f.leagueId,
            seasonId: f.seasonId,
            round: f.round,
          },
        },
      });
      jobCount++;
      log.info(
        { fixtureId: f.id, processAt: formatDate(processAt) },
        "Job queued",
      );
    } else {
      log.debug({ fixtureId: f.id }, "Job already queued, skipping");
    }
  }

  log.info(
    {
      date: today,
      fixturesProcessed: fixtureCount,
      jobsCreated: jobCount,
      durationMs: Date.now() - startTime,
    },
    "Daily sync complete",
  );
  return { fixtures: fixtureCount, jobs: jobCount };
}

export function startMidnightCron(): void {
  cron.schedule("1 0 * * *", async () => {
    try {
      await runDailySync("cron");
    } catch (err) {
      syncLogger.error({ err }, "Midnight cron error");
    }
  });
  syncLogger.info({ schedule: "1 0 * * *" }, "Midnight cron scheduled");
}
