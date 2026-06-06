'use client';

import type { Fixture } from '@/types';

interface Props {
  fixtures: Fixture[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export default function FixtureList({ fixtures, selectedId, onSelect }: Props) {
  return (
    <div style={{ overflowY: 'auto', flex: 1 }}>
      {fixtures.map((f) => {
        const active   = f.id === selectedId;
        const kickoff  = new Date(f.startingAt);
        return (
          <div key={f.id} onClick={() => onSelect(f.id)} style={{
            padding: '12px 14px', borderBottom: '1px solid var(--b1)',
            borderLeft: `3px solid ${active ? 'var(--c)' : 'transparent'}`,
            background: active ? 'rgba(0,212,255,0.07)' : 'transparent',
            cursor: 'pointer', transition: 'all 0.2s',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
              <span style={{ fontSize: 9, letterSpacing: 2, color: 'var(--t3)' }}>
                {f.round ?? 'Group Stage'}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--c)', background: 'rgba(0,212,255,0.1)', padding: '1px 6px', borderRadius: 2 }}>
                {kickoff.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} WAT
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              {f.homeFlagUrl
                ? <img src={f.homeFlagUrl} alt={f.homeTeamName} style={{ width: 24, height: 16, objectFit: 'cover', borderRadius: 1 }} />
                : <span style={{ fontSize: 18, lineHeight: 1 }}>🏳</span>}
              <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, flex: 1, color: 'var(--t1)' }}>{f.homeTeamName.toUpperCase()}</span>
              <span style={{ fontSize: 9, color: 'var(--t3)', fontWeight: 800, letterSpacing: 2, padding: '0 4px' }}>VS</span>
              <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, flex: 1, textAlign: 'right', color: 'var(--t1)' }}>{f.awayTeamName.toUpperCase()}</span>
              {f.awayFlagUrl
                ? <img src={f.awayFlagUrl} alt={f.awayTeamName} style={{ width: 24, height: 16, objectFit: 'cover', borderRadius: 1 }} />
                : <span style={{ fontSize: 18, lineHeight: 1 }}>🏳</span>}
            </div>
            {active && (
              <span style={{ fontSize: 8, letterSpacing: 1, color: 'var(--c)', background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.25)', padding: '1px 5px', borderRadius: 2 }}>
                SELECTED
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
