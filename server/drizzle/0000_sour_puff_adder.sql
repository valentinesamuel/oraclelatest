DO $$ BEGIN
  CREATE TYPE "public"."JobStatus" AS ENUM('PENDING', 'RUNNING', 'COMPLETED', 'POSTPONED', 'VOID');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."MatchStatus" AS ENUM('NOT_STARTED', 'LIVE', 'FINISHED', 'POSTPONED', 'VOID');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Fixture" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"startingAt" timestamp NOT NULL,
	"homeTeamName" varchar NOT NULL,
	"homeFlagUrl" varchar NOT NULL,
	"awayTeamName" varchar NOT NULL,
	"awayFlagUrl" varchar NOT NULL,
	"homeScore" integer,
	"awayScore" integer,
	"status" "MatchStatus" DEFAULT 'NOT_STARTED' NOT NULL,
	"leagueId" integer NOT NULL,
	"seasonId" integer NOT NULL,
	"stateId" integer NOT NULL,
	"round" varchar,
	"aiPreview" text,
	"rawSportmonksData" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "JobQueue" (
	"id" serial PRIMARY KEY NOT NULL,
	"fixtureId" integer NOT NULL,
	"processAt" timestamp NOT NULL,
	"status" "JobStatus" DEFAULT 'PENDING' NOT NULL,
	"retryCount" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"updatedAt" timestamp NOT NULL,
	CONSTRAINT "jobQueue_fixtureId_unique" UNIQUE("fixtureId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Leaderboard" (
	"email" varchar PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"team" varchar NOT NULL,
	"totalPoints" integer DEFAULT 0 NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "OraclePrediction" (
	"id" serial PRIMARY KEY NOT NULL,
	"fixtureId" integer NOT NULL,
	"homeScore" integer NOT NULL,
	"awayScore" integer NOT NULL,
	"confidencePercentage" integer NOT NULL,
	"expectedGoalsHome" double precision NOT NULL,
	"expectedGoalsAway" double precision NOT NULL,
	"analyticalQuote" text NOT NULL,
	"analyticalDriver" varchar NOT NULL,
	"simulationsRun" varchar NOT NULL,
	"upsetProbability" integer NOT NULL,
	"oracleVerdict" varchar NOT NULL,
	"generatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "oraclePrediction_fixtureId_unique" UNIQUE("fixtureId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Prediction" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar NOT NULL,
	"name" varchar NOT NULL,
	"team" varchar NOT NULL,
	"matchDate" varchar NOT NULL,
	"fixtureId" integer NOT NULL,
	"guessHome" integer NOT NULL,
	"guessAway" integer NOT NULL,
	"firstScorer" varchar DEFAULT '' NOT NULL,
	"processed" boolean DEFAULT false NOT NULL,
	"exactScorePoints" integer DEFAULT 0 NOT NULL,
	"correctWinnerPoints" integer DEFAULT 0 NOT NULL,
	"firstScorerPoints" integer DEFAULT 0 NOT NULL,
	"totalPoints" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "prediction_email_matchDate_unique" UNIQUE("email","matchDate")
);
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'JobQueue_fixtureId_Fixture_id_fk'
  ) THEN
    ALTER TABLE "JobQueue" ADD CONSTRAINT "JobQueue_fixtureId_Fixture_id_fk" FOREIGN KEY ("fixtureId") REFERENCES "public"."Fixture"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'OraclePrediction_fixtureId_Fixture_id_fk'
  ) THEN
    ALTER TABLE "OraclePrediction" ADD CONSTRAINT "OraclePrediction_fixtureId_Fixture_id_fk" FOREIGN KEY ("fixtureId") REFERENCES "public"."Fixture"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Prediction_fixtureId_Fixture_id_fk'
  ) THEN
    ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_fixtureId_Fixture_id_fk" FOREIGN KEY ("fixtureId") REFERENCES "public"."Fixture"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leaderboard_totalPoints_idx" ON "Leaderboard" USING btree ("totalPoints");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "prediction_fixtureId_processed_idx" ON "Prediction" USING btree ("fixtureId","processed");
