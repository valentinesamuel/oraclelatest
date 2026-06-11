import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';

export const dynamic = 'force-dynamic';

const EMAIL_DOMAIN = '@ng.ab-inbev.com';

// Build the stored email the same way the server does (normalize + domain).
function buildEmail(prefixRaw: string): string {
  const normalized = prefixRaw.trim().toLowerCase();
  const localPart = normalized.includes('@')
    ? normalized.slice(0, normalized.lastIndexOf('@'))
    : normalized;
  return `${localPart}${EMAIL_DOMAIN}`;
}

export async function GET(req: NextRequest) {
  const prefix = req.nextUrl.searchParams.get('prefix')?.trim();
  if (!prefix) {
    return NextResponse.json({ predictions: [] });
  }

  const email = buildEmail(prefix);

  const predictions = await prisma.prediction.findMany({
    where: { email },
    select: { fixtureId: true, guessHome: true, guessAway: true, firstScorer: true },
  });

  return NextResponse.json({ predictions });
}
