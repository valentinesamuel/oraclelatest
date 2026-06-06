import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const fixtures = await prisma.fixture.findMany({
    where: { status: { not: 'VOID' } },
    orderBy: { startingAt: 'asc' },
    select: {
      id: true, name: true, startingAt: true,
      homeTeamName: true, homeFlagUrl: true,
      awayTeamName: true, awayFlagUrl: true,
      homeScore: true, awayScore: true,
      status: true, round: true, aiPreview: true,
    },
  });
  return NextResponse.json({ fixtures }, { headers: { 'Cache-Control': 'no-store' } });
}
