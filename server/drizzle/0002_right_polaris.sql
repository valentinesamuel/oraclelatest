-- Move the one-prediction limit from per-day (email, matchDate) to per-match (email, fixtureId).
-- Idempotent + uses the Prisma-managed object names that actually exist in this DB.
DROP INDEX IF EXISTS "Prediction_email_matchDate_key";--> statement-breakpoint
ALTER TABLE "Prediction" DROP CONSTRAINT IF EXISTS "prediction_email_matchDate_unique";--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "Prediction_email_fixtureId_key" ON "Prediction" ("email","fixtureId");
