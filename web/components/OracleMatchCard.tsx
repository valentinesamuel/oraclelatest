'use client';

import type { Fixture, OraclePrediction } from '@/types';

interface Props {
  fixture: Fixture;
  oracle: OraclePrediction;
  size?: 'normal' | 'large';
}

export default function OracleMatchCard({ fixture, oracle, size = 'normal' }: Props) {
  const total      = oracle.expectedGoalsHome + oracle.expectedGoalsAway || 1;
  const confPct    = oracle.confidencePercentage;
  const confClass  = confPct > 65 ? 'high' : confPct > 50 ? 'med' : 'low';
  const confColors = { high: 'var(--c3)', med: 'var(--c)', low: 'var(--orange)' };
  const confBgs    = { high: 'rgba(0,255,163,0.12)', med: 'rgba(0,212,255,0.1)', low: 'rgba(255,149,0,0.1)' };
  const confBords  = { high: 'rgba(0,255,163,0.3)', med: 'rgba(0,212,255,0.25)', low: 'rgba(255,149,0,0.3)' };

  const flagSize  = size === 'large' ? 52 : 40;
  const nameSize  = size === 'large' ? 24 : 20;
  const scoreSize = size === 'large' ? 80 : 60;
  const sepSize   = size === 'large' ? 40 : 30;

  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--b2)', borderRadius: 10, padding: size === 'large' ? '22px 26px' : '16px 20px', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 10, letterSpacing: 3, color: 'var(--t3)' }}>
          {fixture.round ?? 'Group Stage'} · {new Date(fixture.startingAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, padding: '4px 12px', borderRadius: 3, color: confColors[confClass], background: confBgs[confClass], border: `1px solid ${confBords[confClass]}` }}>
          {confPct}% CONFIDENCE
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div style={{ textAlign: 'center', flex: 1 }}>
          {fixture.homeFlagUrl
            ? <img src={fixture.homeFlagUrl} alt={fixture.homeTeamName} style={{ width: flagSize, height: Math.round(flagSize * 0.67), objectFit: 'cover', borderRadius: 2, marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
            : <span style={{ fontSize: flagSize, display: 'block', marginBottom: 8 }}>🏳</span>}
          <div style={{ fontSize: nameSize, fontWeight: 900, letterSpacing: 3 }}>{fixture.homeTeamName.toUpperCase()}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: scoreSize, fontWeight: 900, color: 'var(--c)', letterSpacing: -4, lineHeight: 1 }}>{oracle.homeScore}</span>
            <span style={{ fontSize: sepSize, fontWeight: 300, color: 'var(--t3)', margin: '0 4px' }}>—</span>
            <span style={{ fontSize: scoreSize, fontWeight: 900, color: 'var(--c)', letterSpacing: -4, lineHeight: 1 }}>{oracle.awayScore}</span>
          </div>
          <div style={{ fontSize: 9, letterSpacing: 3, color: 'var(--t3)', marginTop: 4 }}>ORACLE PREDICTION</div>
        </div>
        <div style={{ textAlign: 'center', flex: 1 }}>
          {fixture.awayFlagUrl
            ? <img src={fixture.awayFlagUrl} alt={fixture.awayTeamName} style={{ width: flagSize, height: Math.round(flagSize * 0.67), objectFit: 'cover', borderRadius: 2, display: 'block', margin: '0 auto 8px' }} />
            : <span style={{ fontSize: flagSize, display: 'block', marginBottom: 8 }}>🏳</span>}
          <div style={{ fontSize: nameSize, fontWeight: 900, letterSpacing: 3 }}>{fixture.awayTeamName.toUpperCase()}</div>
        </div>
      </div>

      <div style={{ marginBottom: 4 }}>
        <div style={{ fontSize: 9, letterSpacing: 3, color: 'var(--t3)', marginBottom: 8 }}>EXPECTED GOALS (xG) MODEL</div>
        {[
          { label: fixture.homeTeamName.substring(0,3).toUpperCase(), val: oracle.expectedGoalsHome, color: 'var(--c)' },
          { label: fixture.awayTeamName.substring(0,3).toUpperCase(), val: oracle.expectedGoalsAway, color: 'var(--c2)' },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, width: 46, color: 'var(--t2)' }}>{label}</div>
            <div style={{ flex: 1, height: 7, background: 'var(--b1)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${(val / total * 100).toFixed(0)}%`, height: '100%', background: color, borderRadius: 4 }} />
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--t2)', width: 30, textAlign: 'right' }}>{val.toFixed(1)}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 14, background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.15)', borderLeft: '3px solid var(--c)', borderRadius: 4, padding: '10px 14px' }}>
        <div style={{ fontSize: 15, fontWeight: 600, fontStyle: 'italic', lineHeight: 1.4, color: 'var(--t1)', marginBottom: 5 }}>
          &ldquo;{oracle.analyticalQuote}&rdquo;
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--t3)' }}>
          KEY DRIVER · {oracle.analyticalDriver} · {oracle.simulationsRun} simulations
        </div>
      </div>
    </div>
  );
}
