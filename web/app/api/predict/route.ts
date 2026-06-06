import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { applyOracleObfuscation } from '@/lib/oracle-obfuscation';

const VPS_BASE_URL = process.env.VPS_BASE_URL ?? '';
const VPS_SECRET_TOKEN = process.env.VPS_SECRET_TOKEN ?? '';
const EMAIL_DOMAIN = '@ng.ab-inbev.com';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { emailPrefix, name, team, fixtureId, guessHome, guessAway, firstScorer } = body;

  const fullEmail = (emailPrefix ?? '').trim().toLowerCase() + EMAIL_DOMAIN;

  const vpsRes = await fetch(`${VPS_BASE_URL}/api/predictions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${VPS_SECRET_TOKEN}`,
    },
    body: JSON.stringify({ emailPrefix, name, team, fixtureId, guessHome, guessAway, firstScorer }),
  });

  if (!vpsRes.ok) {
    const vpsBody = await vpsRes.json().catch(() => ({ error: 'VPS error' }));
    return NextResponse.json(vpsBody, { status: vpsRes.status });
  }

  const [oracle, fixture] = await Promise.all([
    prisma.oraclePrediction.findUnique({ where: { fixtureId: Number(fixtureId) } }),
    prisma.fixture.findUnique({ where: { id: Number(fixtureId) } }),
  ]);

  if (!oracle || !fixture) {
    return NextResponse.json({ error: 'Oracle data not found' }, { status: 404 });
  }

  const displayOracle = applyOracleObfuscation(
    {
      fixtureId: oracle.fixtureId,
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
    fullEmail,
  );

  return NextResponse.json({
    oracle: displayOracle,
    fixture: {
      id: fixture.id,
      name: fixture.name,
      startingAt: fixture.startingAt.toISOString(),
      homeTeamName: fixture.homeTeamName,
      homeFlagUrl: fixture.homeFlagUrl,
      awayTeamName: fixture.awayTeamName,
      awayFlagUrl: fixture.awayFlagUrl,
      homeScore: fixture.homeScore,
      awayScore: fixture.awayScore,
      status: fixture.status,
      round: fixture.round,
      aiPreview: fixture.aiPreview,
    },
  });
}
