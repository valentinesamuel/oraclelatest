import type { Fixture } from '@/types';

export function getConfidenceColor(percentage: number): string {
  if (percentage > 65) return 'var(--c3)';
  if (percentage > 50) return 'var(--c)';
  return 'var(--orange)';
}

export function getConfidenceLevel(percentage: number): 'high' | 'med' | 'low' {
  if (percentage > 65) return 'high';
  if (percentage > 50) return 'med';
  return 'low';
}

export function calculateXGPercentage(value: number, total: number): string {
  return total > 0 ? (value / total * 100).toFixed(0) : '0';
}

export function buildTickerItems(
  fixtures: Fixture[],
  topPlayer?: string,
  topPoints?: number,
  totalPredictions?: number,
): string[] {
  const fixtureItems = fixtures.map(f =>
    `${f.homeTeamName.toUpperCase()} VS ${f.awayTeamName.toUpperCase()}`
  );

  return [
    ...fixtureItems,
    'ORACLE ACCURACY: 94.3% HISTORICAL · 2.1M+ SIMULATIONS TODAY',
    topPlayer ? `TOP PREDICTOR: ${topPlayer} — ${topPoints} PTS` : null,
    '⚡ UPSET ALERT: Morocco 56% to defeat Germany',
    '⚡ CHAOS MODE: Japan vs Italy — 52% upset probability',
    totalPredictions ? `TOTAL PREDICTIONS TODAY: ${totalPredictions}` : null,
    'ORACLE processes real-time data: form index · weather · squad fitness · tactical DNA · xG',
    'GRAND PRIZE: BEAT THE AI CHAMPION TROPHY — CEREMONY AT 17:00',
    'SCAN THE QR CODE NOW TO CHALLENGE ORACLE',
  ].filter((item): item is string => item !== null);
}

export function obfuscateEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || local.length < 4) return email;
  const first = local.slice(0, 2);
  const last = local.slice(-2);
  const stars = '*'.repeat(Math.max(3, local.length - 4));
  return `${first}${stars}${last}@${domain}`;
}

export function getMondayMidnightWAT(): Date {
  const WAT_OFFSET_MS = 60 * 60 * 1000; // UTC+1
  const nowUTC = Date.now();
  const nowWAT = new Date(nowUTC + WAT_OFFSET_MS);

  const dayOfWeek = nowWAT.getUTCDay(); // 0=Sun, 1=Mon
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const mondayWAT = new Date(nowWAT);
  mondayWAT.setUTCDate(nowWAT.getUTCDate() - daysToMonday);
  mondayWAT.setUTCHours(0, 0, 0, 0);

  return new Date(mondayWAT.getTime() - WAT_OFFSET_MS);
}

export function formatKickoffWAT(date: Date): string {
  const WAT_OFFSET_MS = 60 * 60 * 1000;
  const wat = new Date(date.getTime() + WAT_OFFSET_MS);
  const day = wat.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  const time = wat.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
  return `${day} · ${time} WAT`;
}
