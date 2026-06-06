-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('NOT_STARTED', 'LIVE', 'FINISHED', 'POSTPONED', 'VOID');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'POSTPONED', 'VOID');

-- CreateTable
CREATE TABLE "Fixture" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "startingAt" TIMESTAMP(3) NOT NULL,
    "homeTeamName" TEXT NOT NULL,
    "homeFlagUrl" TEXT NOT NULL,
    "awayTeamName" TEXT NOT NULL,
    "awayFlagUrl" TEXT NOT NULL,
    "homeScore" INTEGER,
    "awayScore" INTEGER,
    "status" "MatchStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "leagueId" INTEGER NOT NULL,
    "seasonId" INTEGER NOT NULL,
    "stateId" INTEGER NOT NULL,
    "round" TEXT,
    "aiPreview" TEXT,
    "rawSportmonksData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Fixture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prediction" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "team" TEXT NOT NULL,
    "matchDate" TEXT NOT NULL,
    "fixtureId" INTEGER NOT NULL,
    "guessHome" INTEGER NOT NULL,
    "guessAway" INTEGER NOT NULL,
    "firstScorer" TEXT NOT NULL DEFAULT '',
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "exactScorePoints" INTEGER NOT NULL DEFAULT 0,
    "correctWinnerPoints" INTEGER NOT NULL DEFAULT 0,
    "firstScorerPoints" INTEGER NOT NULL DEFAULT 0,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Prediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Leaderboard" (
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "team" TEXT NOT NULL,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Leaderboard_pkey" PRIMARY KEY ("email")
);

-- CreateTable
CREATE TABLE "JobQueue" (
    "id" SERIAL NOT NULL,
    "fixtureId" INTEGER NOT NULL,
    "processAt" TIMESTAMP(3) NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OraclePrediction" (
    "id" SERIAL NOT NULL,
    "fixtureId" INTEGER NOT NULL,
    "homeScore" INTEGER NOT NULL,
    "awayScore" INTEGER NOT NULL,
    "confidencePercentage" INTEGER NOT NULL,
    "expectedGoalsHome" DOUBLE PRECISION NOT NULL,
    "expectedGoalsAway" DOUBLE PRECISION NOT NULL,
    "analyticalQuote" TEXT NOT NULL,
    "analyticalDriver" TEXT NOT NULL,
    "simulationsRun" TEXT NOT NULL,
    "upsetProbability" INTEGER NOT NULL,
    "oracleVerdict" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OraclePrediction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Prediction_fixtureId_processed_idx" ON "Prediction"("fixtureId", "processed");

-- CreateIndex
CREATE UNIQUE INDEX "Prediction_email_matchDate_key" ON "Prediction"("email", "matchDate");

-- CreateIndex
CREATE INDEX "Leaderboard_totalPoints_idx" ON "Leaderboard"("totalPoints" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "JobQueue_fixtureId_key" ON "JobQueue"("fixtureId");

-- CreateIndex
CREATE UNIQUE INDEX "OraclePrediction_fixtureId_key" ON "OraclePrediction"("fixtureId");

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "Fixture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobQueue" ADD CONSTRAINT "JobQueue_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "Fixture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OraclePrediction" ADD CONSTRAINT "OraclePrediction_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "Fixture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
