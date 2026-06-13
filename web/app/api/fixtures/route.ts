import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';
import { get3DayRangeWAT } from '../../../lib/utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { start, end } = get3DayRangeWAT();
  const fixtures = await prisma.fixture.findMany({
    where: {
      status: { not: 'VOID' },
      OR: [
        { startingAt: { gte: start, lt: end } },
        { status: 'LIVE' },
      ],
    },
    orderBy: { startingAt: 'asc' },
    select: {
      id: true, name: true, startingAt: true,
      homeTeamName: true, homeFlagUrl: true,
      awayTeamName: true, awayFlagUrl: true,
      homeScore: true, awayScore: true,
      status: true, round: true,
    },
  });
  return NextResponse.json({ fixtures }, { headers: { 'Cache-Control': 'no-store' } });
}
