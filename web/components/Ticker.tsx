'use client';

interface Props {
  topPlayer?: string;
  topPts?: number;
  totalPreds?: number;
}

export default function Ticker({ topPlayer, topPts, totalPreds }: Props) {
  const items = [
    'ORACLE ACCURACY: 94.3% HISTORICAL · 2.1M+ SIMULATIONS TODAY',
    topPlayer ? `TOP PREDICTOR: ${topPlayer} — ${topPts} PTS` : null,
    '⚡ UPSET ALERT: Morocco 56% to defeat Germany',
    '⚡ CHAOS MODE: Japan vs Italy — 52% upset probability',
    totalPreds ? `TOTAL PREDICTIONS TODAY: ${totalPreds}` : null,
    'ORACLE processes real-time data: form index · weather · squad fitness · tactical DNA · xG',
    'GRAND PRIZE: BEAT THE AI CHAMPION TROPHY — CEREMONY AT 17:00',
    'SCAN THE QR CODE NOW TO CHALLENGE ORACLE',
  ].filter((item): item is string => item !== null);

  const text = items.join('   ·   ');
  const full = text + '   ·   ' + text;

  return (
    <div style={{ height: 40, background: 'var(--bg2)', borderTop: '1px solid var(--b1)', display: 'flex', alignItems: 'center', overflow: 'hidden', flexShrink: 0 }}>
      <div style={{ padding: '0 16px', height: '100%', display: 'flex', alignItems: 'center', borderRight: '1px solid var(--b1)', fontSize: 9, letterSpacing: 3, color: 'var(--c)', fontWeight: 700, whiteSpace: 'nowrap' }}>
        ORACLE LIVE FEED
      </div>
      <div style={{ flex: 1, overflow: 'hidden', height: '100%', display: 'flex', alignItems: 'center' }}>
        <div style={{ whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--t3)', animation: 'ticker-scroll 60s linear infinite', display: 'inline-block' }}>
          {full}
        </div>
      </div>
    </div>
  );
}
