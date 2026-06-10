'use client';

type Tab = 'fixtures' | 'predict' | 'leaderboard';

interface Props {
  activeTab: Tab;
  onTab: (tab: Tab) => void;
  liveCount?: number;
  hasActivePrediction?: boolean;
}

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'fixtures',    icon: '⚽', label: 'FIXTURES'  },
  { id: 'predict',     icon: '⚡', label: 'PREDICT'   },
  { id: 'leaderboard', icon: '🏆', label: 'STANDINGS' },
];

export default function BottomTabBar({ activeTab, onTab, liveCount = 0, hasActivePrediction = false }: Props) {
  return (
    <div
      className="tab-bar"
      style={{ background: 'var(--header-bg)', borderTop: '1px solid var(--b2)' }}
    >
      {TABS.map(tab => {
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            className={`tab-bar-item touch-target${active ? ' active' : ''}`}
            onClick={() => onTab(tab.id)}
            style={{ color: active ? 'var(--c)' : 'var(--t3)' }}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>{tab.icon}</span>
            <span style={{ lineHeight: 1 }}>{tab.label}</span>

            {tab.id === 'fixtures' && liveCount > 0 && (
              <span style={{
                position: 'absolute', top: 6, right: '50%', transform: 'translateX(14px)',
                background: 'var(--red)', color: '#fff', fontSize: 8, fontWeight: 800,
                borderRadius: 8, padding: '1px 5px', letterSpacing: 0,
              }}>
                {liveCount}
              </span>
            )}

            {tab.id === 'predict' && hasActivePrediction && (
              <span style={{
                position: 'absolute', top: 6, right: '50%', transform: 'translateX(14px)',
                width: 8, height: 8, borderRadius: '50%',
                background: 'var(--c3)', animation: 'pulse-dot 1s infinite',
              }} />
            )}
          </button>
        );
      })}
    </div>
  );
}
