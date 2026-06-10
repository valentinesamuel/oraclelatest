import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';
import { getMondayMidnightWAT, obfuscateEmail } from '../../../lib/utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  const weekStart = getMondayMidnightWAT();

  const weekly = await prisma.prediction.groupBy({
    by: ['email', 'name', 'team'],
    where: { processed: true, createdAt: { gte: weekStart } },
    _sum: { totalPoints: true },
    orderBy: { _sum: { totalPoints: 'desc' } },
    take: 50,
  });

  const teamStandings = await prisma.prediction.groupBy({
    by: ['team'],
    where: { processed: true },
    _sum: { totalPoints: true },
    orderBy: { _sum: { totalPoints: 'desc' } },
  });

  const leaderboard = weekly.map((entry, i) => ({
    rank: i + 1,
    name: entry.name,
    email: obfuscateEmail(entry.email),
    team: entry.team,
    totalPoints: entry._sum.totalPoints ?? 0,
  }));

  return NextResponse.json({ leaderboard, teamStandings });
}
