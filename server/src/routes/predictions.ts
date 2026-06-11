import { Router, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { eq, and } from "drizzle-orm";
import { db } from "../lib/db";
import { fixture, prediction } from "../db/schema";
import {
  buildEmail,
  validateEmailDomain,
  extractEmailLocalPart,
  validatePrefixFormat,
} from "../utils/email";
import { predictionsLogger } from "../lib/logger";

export const predictionsRouter = Router();

const globalLimiter = rateLimit({
  windowMs: 60_000,
  limit: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Try again in a minute." },
});

const perEmailLimiter = rateLimit({
  windowMs: 60_000,
  limit: 3,
  keyGenerator: (req: Request) => {
    const body = req.body as { emailPrefix?: string };
    return (body.emailPrefix ?? req.ip ?? "unknown").toLowerCase().trim();
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many prediction attempts. Wait a minute before retrying.",
  },
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

const VALID_TEAMS = ["Team Budweiser", "Team Trophy"];

predictionsRouter.post(
  "/",
  async (req: Request, res: Response): Promise<void> => {
    const body = req.body as PredictionBody;

    const rawPrefix = (body.emailPrefix ?? "").trim();
    const localPart = extractEmailLocalPart(rawPrefix);

    if (localPart === null) {
      res
        .status(400)
        .json({
          error:
            "Invalid email domain. Use your official @ng.ab-inbev.com address.",
        });
      return;
    }

    if (!validatePrefixFormat(localPart)) {
      res
        .status(400)
        .json({
          error:
            "Email must be in firstname.lastname format (e.g. john.doe@ng.ab-inbev.com).",
        });
      return;
    }

    const email = buildEmail(localPart);
    if (!validateEmailDomain(email)) {
      res
        .status(400)
        .json({
          error: "Invalid email format. Must be yourname@ng.ab-inbev.com",
        });
      return;
    }

    const name = (body.name ?? "").trim();
    if (!name) {
      res.status(400).json({ error: "Name is required" });
      return;
    }

    if (!VALID_TEAMS.includes(body.team)) {
      res
        .status(400)
        .json({ error: "Team must be Team Budweiser or Team Trophy" });
      return;
    }

    const guessHome = Number(body.guessHome);
    const guessAway = Number(body.guessAway);
    if (
      !Number.isInteger(guessHome) ||
      guessHome < 0 ||
      guessHome > 9 ||
      !Number.isInteger(guessAway) ||
      guessAway < 0 ||
      guessAway > 9
    ) {
      res
        .status(400)
        .json({ error: "Scores must be integers between 0 and 9" });
      return;
    }

    const [found] = await db
      .select()
      .from(fixture)
      .where(eq(fixture.id, Number(body.fixtureId)))
      .limit(1);
    if (!found) {
      res.status(404).json({ error: "Fixture not found" });
      return;
    }

    if (Date.now() >= found.startingAt.getTime()) {
      res
        .status(403)
        .json({
          error: "Prediction window closed. Match has already kicked off.",
        });
      return;
    }

    const matchDate = found.startingAt.toISOString().slice(0, 10);

    const [existing] = await db
      .select({ id: prediction.id })
      .from(prediction)
      .where(
        and(eq(prediction.email, email), eq(prediction.matchDate, matchDate)),
      )
      .limit(1);
    if (existing) {
      res
        .status(400)
        .json({
          error: "You have already submitted a prediction for this date.",
        });
      return;
    }

    try {
      await db.insert(prediction).values({
        email,
        name,
        team: body.team,
        matchDate,
        fixtureId: found.id,
        guessHome,
        guessAway,
        firstScorer: (body.firstScorer ?? "").trim(),
      });
      res.status(200).json({ message: "Prediction saved" });
    } catch (err: unknown) {
      if ((err as any)?.code === "23505") {
        res
          .status(400)
          .json({
            error: "You have already submitted a prediction for this date.",
          });
        return;
      }
      predictionsLogger.error(
        { err, email, fixtureId: found.id },
        "Prediction insert failed",
      );
      res.status(500).json({ error: "Internal server error" });
    }
  },
);
