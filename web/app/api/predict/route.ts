import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/db";

const VPS_BASE_URL = process.env.VPS_BASE_URL ?? "";
const VPS_SECRET_TOKEN = process.env.VPS_SECRET_TOKEN ?? "";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    emailPrefix,
    name,
    team,
    fixtureId,
    guessHome,
    guessAway,
    firstScorer,
  } = body;

  const vpsRes = await fetch(`${VPS_BASE_URL}/api/predictions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${VPS_SECRET_TOKEN}`,
    },
    body: JSON.stringify({
      emailPrefix,
      name,
      team,
      fixtureId,
      guessHome,
      guessAway,
      firstScorer,
    }),
  });

  if (!vpsRes.ok) {
    const vpsBody = await vpsRes.json().catch(() => ({ error: "VPS error" }));
    return NextResponse.json(vpsBody, { status: vpsRes.status });
  }

  const fixture = await prisma.fixture.findUnique({
    where: { id: Number(fixtureId) },
  });

  if (!fixture) {
    return NextResponse.json({ error: "Fixture not found" }, { status: 404 });
  }

  return NextResponse.json({
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
    },
  });
}
