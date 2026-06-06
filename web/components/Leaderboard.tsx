'use client';

import type { LeaderboardEntry } from '@/types';

const AV_COLORS = ['#00d4ff','#00ffa3','#ffd700','#ff6b6b','#c084fc','#fb923c','#34d399','#60a5fa','#f472b6','#a78bfa'];
const TEAM_COLORS: Record<string, string> = {
  'Team Budweiser': '#e63946',
  'Team Trophy': '#f4a261',
};

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

interface Props {
  leaderboard: LeaderboardEntry[];
  maxRows?: number;
}

export default function Leaderboard({ leaderboard, maxRows = 12 }: Props) {
  const sorted = [...leaderboard].sort((a, b) => b.totalPoints - a.totalPoints).slice(0, maxRows);

  const teamTotals: Record<string, number> = {};
  leaderboard.forEach(e => { teamTotals[e.team] = (teamTotals[e.team] || 0) + e.totalPoints; });
  const teamArr = Object.entries(teamTotals).sort((a, b) => b[1] - a[1]);
  const maxTeamPts = teamArr[0]?.[1] || 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {sorted.map((entry, i) => {
          const rankColor = i === 0 ? 'var(--gold)' : i === 1 ? '#b0b8c8' : i === 2 ? '#cd8e60' : 'var(--t3)';
          const rankLabel = i < 3 ? ['①','②','③'][i] : String(i + 1);
          const col = AV_COLORS[i % AV_COLORS.length];

          return (
            <div key={entry.email} style={{
              padding: '9px 14px', borderBottom: '1px solid var(--b1)',
              display: 'flex', alignItems: 'center', gap: 8,
              background: i === 0 ? 'rgba(255,215,0,0.04)' : 'transparent',
            }}>
              <div style={{ fontSize: i < 3 ? 16 : 13, fontWeight: 900, width: 24, textAlign: 'center', color: rankColor, flexShrink: 0 }}>
                {rankLabel}
              </div>
              <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: `${col}22`, color: col, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>
                {initials(entry.name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {entry.name}
                </div>
                <div style={{ fontSize: 9, color: 'var(--t3)', fontFamily: 'var(--font-mono)' }}>
                  {entry.team}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: 'var(--c3)' }}>
                  {entry.totalPoints}
                </div>
                <div style={{ fontSize: 8, letterSpacing: 1, color: 'var(--t3)' }}>PTS</div>
              </div>
            </div>
          );
        })}
      </div>

      {teamArr.length > 0 && (
        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--b1)', flexShrink: 0 }}>
          <div style={{ fontSize: 9, letterSpacing: 3, color: 'var(--t3)', marginBottom: 8 }}>TEAM STANDINGS</div>
          {teamArr.map(([name, pts], i) => {
            const color = TEAM_COLORS[name] || AV_COLORS[i];
            return (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, width: 100, color: 'var(--t2)' }}>
                  {name}
                </div>
                <div style={{ flex: 1, height: 5, background: 'var(--b1)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.round(pts / maxTeamPts * 100)}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 1s ease' }} />
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--t3)', width: 32, textAlign: 'right' }}>
                  {pts}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
