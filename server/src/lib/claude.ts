import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { claudeLogger } from './logger';

const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

const ORACLE_SYSTEM = `You are ORACLE, an AI football prediction engine. Analyze the provided match and return ONLY valid JSON matching this exact schema. No prose, no markdown, no explanation — raw JSON only.

Schema:
{
  "homeScore": integer,
  "awayScore": integer,
  "confidencePercentage": integer (0-100),
  "expectedGoalsHome": float (2 decimal places),
  "expectedGoalsAway": float (2 decimal places),
  "analyticalQuote": string (max 120 chars),
  "analyticalDriver": string (max 40 chars),
  "simulationsRun": string (format "X.XM"),
  "upsetProbability": integer (0-100),
  "oracleVerdict": "HOME_WIN" | "AWAY_WIN" | "DRAW"
}`;

const OracleSchema = z.object({
  homeScore: z.number().int().min(0).max(9),
  awayScore: z.number().int().min(0).max(9),
  confidencePercentage: z.number().int().min(0).max(100),
  expectedGoalsHome: z.number().min(0),
  expectedGoalsAway: z.number().min(0),
  analyticalQuote: z.string().max(120),
  analyticalDriver: z.string().max(40),
  simulationsRun: z.string(),
  upsetProbability: z.number().int().min(0).max(100),
  oracleVerdict: z.enum(['HOME_WIN', 'AWAY_WIN', 'DRAW']),
});

export type OracleData = z.infer<typeof OracleSchema>;

function fallbackOracle(homeTeam: string, awayTeam: string): OracleData {
  return {
    homeScore: 1, awayScore: 1,
    confidencePercentage: 65, upsetProbability: 20,
    expectedGoalsHome: 1.20, expectedGoalsAway: 1.20,
    analyticalQuote: `${homeTeam} and ${awayTeam} face off in an evenly contested group stage clash.`,
    analyticalDriver: 'Form Index',
    simulationsRun: '1.4M',
    oracleVerdict: 'DRAW' as const,
  };
}

export async function generateOraclePrediction(
  homeTeam: string,
  awayTeam: string,
): Promise<OracleData | null> {
  const log = claudeLogger.child({ homeTeam, awayTeam });
  const t0 = Date.now();

  log.debug({ model: 'claude-haiku-4-5-20251001', maxTokens: 512 }, 'Oracle API call start');

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: ORACLE_SYSTEM,
      messages: [{ role: 'user', content: `Predict the match: ${homeTeam} vs ${awayTeam}.` }],
    });

    log.info({
      latencyMs: Date.now() - t0,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    }, 'Oracle API call success');

    const rawText = response.content[0].type === 'text' ? response.content[0].text : '';
    const cleaned = rawText.replace(/```(?:json)?\n?/g, '').trim();

    const parsed = OracleSchema.safeParse(JSON.parse(cleaned));
    if (!parsed.success) {
      log.warn({ zodError: parsed.error.issues, raw: cleaned.slice(0, 200) }, 'Oracle JSON parse failed, using fallback');
      return fallbackOracle(homeTeam, awayTeam);
    }

    return parsed.data;
  } catch (err) {
    const isCreditsExhausted =
      err instanceof Anthropic.BadRequestError &&
      err.status === 400 &&
      err.message.includes('credit balance is too low');

    if (isCreditsExhausted) {
      log.warn({ latencyMs: Date.now() - t0 }, 'Oracle skipped: Anthropic credit balance exhausted');
      return null;
    }

    log.error({ err, latencyMs: Date.now() - t0 }, 'Oracle API call failed, using fallback');
    return fallbackOracle(homeTeam, awayTeam);
  }
}
