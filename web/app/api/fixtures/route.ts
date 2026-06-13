import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';
import { get3DayRangeWAT } from '../../../lib/utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { start, end } = get3DayRangeWAT();
  const cutoff = new Date(Date.now() - 120 * 60 * 1000);
  const fixtures = await prisma.fixture.findMany({
    where: {
      OR: [
        // Non-FINISHED, non-VOID matches within the 3-day window
        {
          status: { notIn: ['FINISHED', 'VOID'] },
          startingAt: { gte: start, lt: end },
        },
        // LIVE always included regardless of date range
        { status: 'LIVE' },
        // FINISHED matches still within their visibility window
        {
          status: 'FINISHED',
          OR: [
            // Job still in progress — scoring not yet complete
            { jobQueue: { status: { in: ['PENDING', 'RUNNING'] } } },
            // Scoring complete, within 120-min grace period
            { jobQueue: { status: 'COMPLETED', updatedAt: { gte: cutoff } } },
            // No job record, match started < 120 min ago (edge case)
            { jobQueue: { is: null }, startingAt: { gte: cutoff } },
          ],
        },
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
