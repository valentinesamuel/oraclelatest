'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
 
import Ticker from '../../components/Ticker';
import type { Fixture, LeaderboardEntry, Team } from '../../types';
import Leaderboard from '../../components/Leaderboard';

type View = 'select' | 'predict' | 'loading' | 'reveal';

function statusLabel(status: string): string {
  switch (status) {
    case 'NOT_STARTED': return 'NS';
    case 'LIVE': return 'LIVE';
    case 'FINISHED': return 'FT';
    case 'POSTPONED': return 'PST';
    case 'VOID': return 'VOID';
    default: return status;
  }
}

function isLive(f: Fixture)     { return f.status === 'LIVE'; }
function isFinished(f: Fixture) { return f.status === 'FINISHED'; }
function canPredict(f: Fixture) { return f.status === 'NOT_STARTED' && new Date(f.startingAt) > new Date(); }

function useCountUp(target: number, active: boolean, duration = 1400) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) { setVal(0); return; }
    const start = Date.now();
    const tick = () => {
      const p = Math.min((Date.now() - start) / duration, 1);
      setVal(Math.floor(p * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, active, duration]);
  return val;
}

function AnimatedBar({ pct, color, delay = 0 }: { pct: number; color: string; delay?: number }) {
  const [width, setWidth] = useState(0);
  useEffect(() => { const t = setTimeout(() => setWidth(pct), delay); return () => clearTimeout(t); }, [pct, delay]);
  return (
    <div style={{ flex: 1, height: 8, background: 'var(--b1)', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{ width: `${width}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 1.2s cubic-bezier(.4,0,.2,1)' }} />
    </div>
  );
}

function FlagImg({ url, alt }: { url: string | null; alt: string }) {
  if (!url) return <span style={{ fontSize: 24 }}>🏳</span>;
  return <img src={url} alt={alt} style={{ width: 32, height: 22, objectFit: 'cover', borderRadius: 2 }} />;
}

function StatusBadge({ fixture }: { fixture: Fixture }) {
  const live = isLive(fixture);
  const finished = isFinished(fixture);
  const predict = canPredict(fixture);
  const label = statusLabel(fixture.status);
  const color = live ? 'var(--red)' : finished ? 'var(--t3)' : predict ? 'var(--c3)' : 'var(--orange)';
  const bg    = live ? 'rgba(255,64,64,0.15)' : finished ? 'rgba(255,255,255,0.05)' : predict ? 'rgba(0,255,163,0.1)' : 'rgba(255,149,0,0.1)';
  return (
    <span style={{ fontSize: 9, letterSpacing: 2, color, background: bg, border: `1px solid ${color}`, padding: '2px 7px', borderRadius: 3, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      {live && <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, animation: 'pulse-dot 1s infinite', display: 'inline-block' }} />}
      {label.toUpperCase()}
    </span>
  );
}

export default function ArenaPage() {
  const [fixtures, setFixtures]           = useState<Fixture[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Fixture | null>(null);
  const [view, setView]                   = useState<View>('select');
  const [userName, setUserName]           = useState('');
  const [emailPrefix, setEmailPrefix]     = useState('');
  const [team, setTeam]                   = useState<Team>('Team Budweiser');
  const [homeScore, setHomeScore]         = useState(1);
  const [awayScore, setAwayScore]         = useState(1);
  const [firstScorer, setFirstScorer]     = useState('');
  const [resultFixture, setResultFixture] = useState<Fixture | null>(null);
  const [loadingMsg, setLoadingMsg]       = useState('');
  const [revealStep, setRevealStep]       = useState(0);
  const [leaderboard, setLeaderboard]     = useState<LeaderboardEntry[]>([]);
  const [oracleStatus, setOracleStatus]   = useState('AWAITING PREDICTIONS');
  const [fixturesLoading, setFixturesLoading] = useState(true);

  const liveFixtures     = fixtures.filter(isLive);
  const predictable      = fixtures.filter(canPredict).sort((a, b) => new Date(a.startingAt).getTime() - new Date(b.startingAt).getTime());
  const finishedFixtures = fixtures.filter(isFinished).sort((a, b) => new Date(b.startingAt).getTime() - new Date(a.startingAt).getTime()).slice(0, 5);
  const liveCount        = liveFixtures.length;

  const fetchFixtures = useCallback(async () => {
    try {
      const res  = await fetch('/api/fixtures');
      const data = await res.json();
      const list: Fixture[] = (data.fixtures ?? []).map((f: any) => ({
        ...f,
        startingAt: typeof f.startingAt === 'string' ? f.startingAt : new Date(f.startingAt).toISOString(),
      }));
      setFixtures(list);
      if (selectedMatch) {
        const updated = list.find(f => f.id === selectedMatch.id);
        if (updated) setSelectedMatch(updated);
      }
    } catch { /* silent */ }
    finally { setFixturesLoading(false); }
  }, [selectedMatch]);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res  = await fetch('/api/leaderboard');
      const data = await res.json();
      setLeaderboard(data.leaderboard ?? []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchFixtures(); fetchLeaderboard(); }, []);
  useEffect(() => { const t = setInterval(fetchFixtures, 30_000);  return () => clearInterval(t); }, [fetchFixtures]);
  useEffect(() => { const t = setInterval(fetchLeaderboard, 30_000); return () => clearInterval(t); }, [fetchLeaderboard]);

  useEffect(() => {
    const msgs: Record<View, string[]> = {
      select:  ['AWAITING PREDICTIONS', 'SELECT A FIXTURE'],
      predict: ['READY TO ANALYZE', 'AWAITING YOUR PICK'],
      loading: ['LOCKING IN YOUR PREDICTION...', 'REGISTERING ENTRY...', 'ALMOST DONE...'],
      reveal:  ['PREDICTION SEALED', 'LOCKED IN', 'AWAITING FULL TIME'],
    };
    let i = 0; const list = msgs[view]; setOracleStatus(list[0]);
    const t = setInterval(() => { i = (i + 1) % list.length; setOracleStatus(list[i]); }, view === 'loading' ? 900 : 3200);
    return () => clearInterval(t);
  }, [view]);

  useEffect(() => {
    if (view !== 'reveal') { setRevealStep(0); return; }
    const timers = [80, 550, 1050].map((d, i) => setTimeout(() => setRevealStep(i + 1), d));
    return () => timers.forEach(clearTimeout);
  }, [view]);

  const handleSelectMatch = (fixture: Fixture) => {
    if (!canPredict(fixture)) return;
    setSelectedMatch(fixture);
    setResultFixture(null);
    setRevealStep(0);
    setView('predict');
  };

  const handleSubmit = async () => {
    if (!userName.trim() || !emailPrefix.trim() || !selectedMatch) return;
    setView('loading');
    const msgs = ['Locking in your prediction...', 'Registering your entry...', 'Almost done...'];
    let mi = 0; setLoadingMsg(msgs[0]);
    const msgTimer = setInterval(() => { mi = Math.min(mi + 1, msgs.length - 1); setLoadingMsg(msgs[mi]); }, 1300);
    try {
      const res  = await fetch('/api/predict', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailPrefix: emailPrefix.trim(),
          name: userName.trim(),
          team,
          fixtureId: selectedMatch.id,
          guessHome: homeScore,
          guessAway: awayScore,
          firstScorer: firstScorer.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? 'Prediction failed');
        clearInterval(msgTimer);
        setView('predict');
        return;
      }
      setResultFixture(data.fixture);
      await fetchLeaderboard();
      clearInterval(msgTimer);
      setView('reveal');
    } catch (e) {
      console.error(e);
      clearInterval(msgTimer);
      setView('predict');
    }
  };

  const topPlayer = leaderboard[0];

  const FixtureRow = ({ fixture }: { fixture: Fixture }) => {
    const active  = selectedMatch?.id === fixture.id;
    const locked  = !canPredict(fixture);
    const live    = isLive(fixture);
    const finished = isFinished(fixture);
    return (
      <div onClick={() => !locked && handleSelectMatch(fixture)} style={{
        padding: '10px 14px', borderBottom: '1px solid var(--b1)',
        borderLeft: `3px solid ${active ? 'var(--c)' : live ? 'var(--red)' : 'transparent'}`,
        background: active ? 'rgba(255,215,0,0.07)' : live ? 'rgba(255,64,64,0.04)' : 'transparent',
        cursor: locked ? 'default' : 'pointer', opacity: locked && !live ? 0.7 : 1,
        transition: 'all 0.2s',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 9, letterSpacing: 1, color: 'var(--t3)' }}>{fixture.round ?? 'Group Stage'}</span>
          <StatusBadge fixture={fixture} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <FlagImg url={fixture.homeFlagUrl} alt={fixture.homeTeamName} />
          <span style={{ fontSize: 12, fontWeight: 700, flex: 1, color: 'var(--t1)' }}>{fixture.homeTeamName.toUpperCase()}</span>
          {(live || finished) && fixture.homeScore !== null ? (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 900, color: live ? 'var(--red)' : 'var(--t2)', padding: '0 6px' }}>
              {fixture.homeScore} – {fixture.awayScore}
            </span>
          ) : (
            <span style={{ fontSize: 9, color: 'var(--t3)', padding: '0 8px' }}>VS</span>
          )}
          <span style={{ fontSize: 12, fontWeight: 700, flex: 1, textAlign: 'right', color: 'var(--t1)' }}>{fixture.awayTeamName.toUpperCase()}</span>
          <FlagImg url={fixture.awayFlagUrl} alt={fixture.awayTeamName} />
        </div>
        <div style={{ fontSize: 9, color: 'var(--t3)', marginTop: 5 }}>
          {new Date(fixture.startingAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · {new Date(fixture.startingAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} WAT
          {locked && !live && !finished && <span style={{ color: 'var(--orange)', marginLeft: 6 }}>🔒 Locked</span>}
        </div>
      </div>
    );
  };

  const Stepper = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <button onClick={() => onChange(Math.min(9, value + 1))} style={{ width: 58, height: 30, background: 'var(--bg3)', border: '1px solid var(--b2)', borderRadius: '4px 4px 0 0', color: 'var(--t2)', fontSize: 18, cursor: 'pointer', fontWeight: 700 }}>+</button>
      <div style={{ width: 58, height: 56, background: 'var(--bg3)', border: '1px solid var(--b2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, fontWeight: 900, color: 'var(--t1)' }}>{value}</div>
      <button onClick={() => onChange(Math.max(0, value - 1))} style={{ width: 58, height: 30, background: 'var(--bg3)', border: '1px solid var(--b2)', borderRadius: '0 0 4px 4px', color: 'var(--t2)', fontSize: 18, cursor: 'pointer', fontWeight: 700 }}>−</button>
    </div>
  );

  return (
    <div style={{ width: '100vw', height: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ position: 'fixed', inset: 0, opacity: 0.03, pointerEvents: 'none', zIndex: 0, backgroundImage: 'linear-gradient(var(--c) 1px,transparent 1px),linear-gradient(90deg,var(--c) 1px,transparent 1px)', backgroundSize: '80px 80px' }} />
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1, background: 'radial-gradient(ellipse at center,transparent 30%,var(--vignette) 100%)' }} />

      {/* Header */}
      <div style={{ height: 64, flexShrink: 0, background: 'var(--header-bg)', borderBottom: '1px solid var(--b2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Image src="/ibplc-logo.png" alt="IBPLC" width={38} height={51} style={{ display: 'block' }} />
          <div>
            <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: 6, color: 'var(--c)', lineHeight: 1 }}>BATTLE OF THE BRANDS</div>
            <div style={{ fontSize: 9, letterSpacing: 4, color: 'var(--t3)' }}>PREDICTION ENGINE v4.1 · FIFA WORLD CUP 2026</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--c3)' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--c3)', animation: 'pulse-glow 2s infinite' }} />
            {oracleStatus}
          </div>
          {liveCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,64,64,0.15)', border: '1px solid rgba(255,64,64,0.5)', padding: '5px 12px', borderRadius: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)', animation: 'pulse-dot 1s infinite' }} />
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, color: '#ff7070' }}>{liveCount} LIVE</span>
            </div>
          )}
          <div style={{ background: 'var(--bg3)', border: '1px solid var(--b1)', padding: '4px 14px', borderRadius: 4, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--t2)' }}>
            {leaderboard.length} PLAYERS
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '290px 1fr 280px', minHeight: 0, position: 'relative', zIndex: 5 }}>

        {/* LEFT: fixture list */}
        <div style={{ borderRight: '1px solid var(--b1)', background: 'var(--sidebar-bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--b1)', background: 'var(--bg2)', flexShrink: 0 }}>
            <div style={{ fontSize: 10, letterSpacing: 4, color: 'var(--t3)', marginBottom: 2 }}>FIXTURES</div>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, color: 'var(--t1)' }}>
              {fixturesLoading ? 'Loading...' : `${predictable.length} available to predict`}
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {fixturesLoading && (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--t3)', fontSize: 12 }}>Syncing fixtures…</div>
            )}
            {liveFixtures.length > 0 && (
              <>
                <div style={{ padding: '6px 14px', background: 'rgba(255,64,64,0.08)', fontSize: 8, letterSpacing: 3, color: 'var(--red)', borderBottom: '1px solid var(--b1)' }}>⚡ LIVE NOW</div>
                {liveFixtures.map(f => <FixtureRow key={f.id} fixture={f} />)}
              </>
            )}
            {predictable.length > 0 && (
              <>
                <div style={{ padding: '6px 14px', background: 'rgba(255,215,0,0.04)', fontSize: 8, letterSpacing: 3, color: 'var(--c)', borderBottom: '1px solid var(--b1)' }}>PREDICT NOW</div>
                {predictable.map(f => <FixtureRow key={f.id} fixture={f} />)}
              </>
            )}
            {finishedFixtures.length > 0 && (
              <>
                <div style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.02)', fontSize: 8, letterSpacing: 3, color: 'var(--t3)', borderBottom: '1px solid var(--b1)' }}>RESULTS</div>
                {finishedFixtures.map(f => <FixtureRow key={f.id} fixture={f} />)}
              </>
            )}
          </div>
        </div>

        {/* CENTER */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* SELECT */}
          {view === 'select' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', gap: 28, textAlign: 'center' }}>
              <div style={{ width: 76, height: 102, animation: 'pulse-glow 3s infinite', border: '2px solid rgba(255,215,0,0.3)', borderRadius: 8 }}>
                <Image src="/ibplc-logo.png" alt="IBPLC" width={76} height={102} style={{ display: 'block', borderRadius: 6 }} />
              </div>
              <div>
                <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: 4, color: 'var(--c)', marginBottom: 10 }}>BOTB IS READY</div>
                <div style={{ fontSize: 14, color: 'var(--t2)', lineHeight: 1.8, maxWidth: 400 }}>
                  Select an upcoming fixture from the left.<br />
                  Predict blind — BOTB's call is sealed until after you submit.<br />
                  <strong style={{ color: 'var(--c3)' }}>Points are awarded automatically at Full Time.</strong>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                {[['50 PTS','EXACT SCORE','var(--c3)'],['20 PTS','CORRECT WINNER','var(--c)'],['10 PTS','FIRST SCORER','var(--gold)']].map(([pts,label,color]) => (
                  <div key={label} style={{ textAlign: 'center', background: 'var(--bg2)', border: '1px solid var(--b1)', borderRadius: 6, padding: '12px 14px' }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color, lineHeight: 1 }}>{pts}</div>
                    <div style={{ fontSize: 9, letterSpacing: 2, color: 'var(--t3)', marginTop: 5 }}>{label}</div>
                  </div>
                ))}
              </div>
              {liveCount > 0 && (
                <div style={{ background: 'rgba(255,64,64,0.08)', border: '1px solid rgba(255,64,64,0.3)', borderRadius: 6, padding: '10px 18px', fontSize: 12, color: '#ff8888' }}>
                  ⚡ {liveCount} match{liveCount > 1 ? 'es' : ''} live right now — predictions are locked until next fixture
                </div>
              )}
            </div>
          )}

          {/* PREDICT */}
          {view === 'predict' && selectedMatch && (
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '18px 24px 0', flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 9, letterSpacing: 4, color: 'var(--t3)' }}>
                    {selectedMatch.round ?? 'Group Stage'} · {new Date(selectedMatch.startingAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                  <StatusBadge fixture={selectedMatch} />
                </div>
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--b2)', borderRadius: 10, padding: '18px 24px', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ textAlign: 'center', flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                        <FlagImg url={selectedMatch.homeFlagUrl} alt={selectedMatch.homeTeamName} />
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 3 }}>{selectedMatch.homeTeamName.toUpperCase()}</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '0 16px' }}>
                      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 4, color: 'var(--t3)' }}>VS</div>
                      <div style={{ fontSize: 9, color: 'var(--t3)', marginTop: 6, letterSpacing: 2 }}>
                        {new Date(selectedMatch.startingAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} WAT
                      </div>
                    </div>
                    <div style={{ textAlign: 'center', flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                        <FlagImg url={selectedMatch.awayFlagUrl} alt={selectedMatch.awayTeamName} />
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 3 }}>{selectedMatch.awayTeamName.toUpperCase()}</div>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(255,215,0,0.04)', border: '1px solid rgba(255,215,0,0.12)', borderRadius: 6 }}>
                  <span style={{ fontSize: 14 }}>🔒</span>
                  <span style={{ fontSize: 11, color: 'var(--t3)', letterSpacing: 1 }}>BOTB's prediction is sealed until you submit. Points awarded at Full Time.</span>
                </div>
              </div>
              <div style={{ padding: '16px 24px 20px', display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 9, letterSpacing: 2, color: 'var(--t3)', display: 'block', marginBottom: 6 }}>YOUR NAME</label>
                    <input value={userName} onChange={e => setUserName(e.target.value)} placeholder="Enter your name..."
                      style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--b2)', borderRadius: 6, padding: '10px 12px', color: 'var(--t1)', fontFamily: 'var(--font-head)', fontSize: 15, outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 9, letterSpacing: 2, color: 'var(--t3)', display: 'block', marginBottom: 6 }}>EMAIL <span style={{ color: 'var(--t3)' }}>@ng.ab-inbev.com</span></label>
                    <input value={emailPrefix} onChange={e => setEmailPrefix(e.target.value)} placeholder="firstname.lastname"
                      style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--b2)', borderRadius: 6, padding: '10px 12px', color: 'var(--t1)', fontFamily: 'var(--font-head)', fontSize: 15, outline: 'none' }} />
                    <div style={{ fontSize: 9, color: 'var(--t3)', marginTop: 4, letterSpacing: 0.5 }}>Use your official email: firstname.lastname@ng.ab-inbev.com</div>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 9, letterSpacing: 2, color: 'var(--t3)', display: 'block', marginBottom: 6 }}>YOUR TEAM</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {(['Team Budweiser', 'Team Trophy'] as Team[]).map(t => (
                      <button key={t} onClick={() => setTeam(t)} style={{
                        padding: '10px', borderRadius: 6, cursor: 'pointer', fontFamily: 'var(--font-head)', fontSize: 13, fontWeight: 700, letterSpacing: 1,
                        background: team === t ? 'rgba(255,215,0,0.12)' : 'var(--bg3)',
                        border: `1px solid ${team === t ? 'var(--c)' : 'var(--b2)'}`,
                        color: team === t ? 'var(--c)' : 'var(--t2)',
                      }}>{t.toUpperCase()}</button>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 9, letterSpacing: 2, color: 'var(--t3)', display: 'block', marginBottom: 8 }}>YOUR PREDICTED SCORE</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                        <div style={{ fontSize: 9, color: 'var(--t3)', letterSpacing: 1 }}>{selectedMatch.homeTeamName.substring(0,3).toUpperCase()}</div>
                        <Stepper value={homeScore} onChange={setHomeScore} />
                      </div>
                      <div style={{ fontSize: 28, color: 'var(--t3)', fontWeight: 300, paddingTop: 20 }}>—</div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                        <div style={{ fontSize: 9, color: 'var(--t3)', letterSpacing: 1 }}>{selectedMatch.awayTeamName.substring(0,3).toUpperCase()}</div>
                        <Stepper value={awayScore} onChange={setAwayScore} />
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 6 }}>
                    <label style={{ fontSize: 9, letterSpacing: 2, color: 'var(--t3)', display: 'block' }}>FIRST SCORER (Full Name) · OPTIONAL <span style={{ color: 'var(--gold)' }}>+10 PTS</span></label>
                    <input value={firstScorer} onChange={e => setFirstScorer(e.target.value)} placeholder="Player name..."
                      style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--b2)', borderRadius: 6, padding: '10px 12px', color: 'var(--t1)', fontFamily: 'var(--font-head)', fontSize: 15, outline: 'none' }} />
                    <div style={{ fontSize: 10, color: 'var(--t3)', lineHeight: 1.5 }}>Predictions lock at kick-off. Results scored at Full Time.</div>
                  </div>
                </div>
                <button onClick={handleSubmit} disabled={!userName.trim() || !emailPrefix.trim()}
                  style={{ width: '100%', border: 'none', borderRadius: 6, padding: '16px', background: (!userName.trim() || !emailPrefix.trim()) ? 'var(--b2)' : 'linear-gradient(135deg,var(--c),var(--c2))', color: (!userName.trim() || !emailPrefix.trim()) ? 'var(--t3)' : '#000', fontFamily: 'var(--font-head)', fontSize: 19, fontWeight: 800, letterSpacing: 3, cursor: (!userName.trim() || !emailPrefix.trim()) ? 'not-allowed' : 'pointer' }}>
                  ⚡ LOCK IN &amp; CHALLENGE BOTB
                </button>
              </div>
            </div>
          )}

          {/* LOADING */}
          {view === 'loading' && selectedMatch && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28, padding: '2rem' }}>
              <div style={{ width: 84, height: 113, animation: 'pulse-glow 1s infinite', border: '2px solid var(--c)', borderRadius: 8 }}>
                <Image src="/ibplc-logo.png" alt="IBPLC" width={84} height={113} style={{ display: 'block', borderRadius: 6 }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 12, letterSpacing: 4, color: 'var(--c)', marginBottom: 10, fontFamily: 'var(--font-mono)' }}>LOCKING IN YOUR PREDICTION</div>
                <div style={{ fontSize: 16, color: 'var(--t1)', marginBottom: 6 }}>{loadingMsg}</div>
                <div style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--font-mono)' }}>{selectedMatch.homeTeamName} vs {selectedMatch.awayTeamName}</div>
              </div>
            </div>
          )}

          {/* REVEAL */}
          {view === 'reveal' && (resultFixture ?? selectedMatch) && (() => {
            const fix = resultFixture ?? selectedMatch!;
            return (
              <div style={{ flex: 1, overflowY: 'auto', padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {revealStep >= 1 && (
                  <div style={{ animation: 'slide-up 0.4s ease', background: 'var(--bg2)', border: '1px solid var(--b2)', borderRadius: 10, padding: '16px 20px' }}>
                    <div style={{ fontSize: 9, letterSpacing: 4, color: 'var(--t3)', marginBottom: 12 }}>{fix.round ?? 'Group Stage'} · PREDICTION SEALED</div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 10, letterSpacing: 3, color: 'var(--t3)', marginBottom: 10 }}>YOUR PREDICTION</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
                        <FlagImg url={fix.homeFlagUrl} alt={fix.homeTeamName} />
                        <span style={{ fontSize: 46, fontWeight: 900, color: 'var(--t1)', letterSpacing: -2, lineHeight: 1 }}>{homeScore}</span>
                        <span style={{ fontSize: 22, color: 'var(--t3)', fontWeight: 300 }}>—</span>
                        <span style={{ fontSize: 46, fontWeight: 900, color: 'var(--t1)', letterSpacing: -2, lineHeight: 1 }}>{awayScore}</span>
                        <FlagImg url={fix.awayFlagUrl} alt={fix.awayTeamName} />
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t2)' }}>{userName}</div>
                    </div>
                  </div>
                )}
                {revealStep >= 2 && (
                  <div style={{ animation: 'slide-up 0.4s ease', background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: 8, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ fontSize: 28 }}>⏳</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--c)', marginBottom: 4 }}>Prediction Locked In!</div>
                      <div style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.5 }}>
                        Points are awarded automatically when the match reaches Full Time.<br />
                        Kick-off: <strong style={{ color: 'var(--t1)' }}>{new Date(fix.startingAt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · {new Date(fix.startingAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} WAT</strong>
                      </div>
                    </div>
                  </div>
                )}
                {revealStep >= 3 && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <button onClick={() => { setView('select'); setSelectedMatch(null); setResultFixture(null); setRevealStep(0); }}
                      style={{ background: 'linear-gradient(135deg,var(--c),var(--c2))', border: 'none', borderRadius: 6, padding: '14px', color: '#000', fontFamily: 'var(--font-head)', fontSize: 15, fontWeight: 800, letterSpacing: 2, cursor: 'pointer' }}>
                      ⚡ PREDICT ANOTHER MATCH
                    </button>
                    <button onClick={() => { setView('select'); setSelectedMatch(null); setResultFixture(null); setRevealStep(0); setUserName(''); setEmailPrefix(''); setHomeScore(1); setAwayScore(1); setFirstScorer(''); }}
                      style={{ background: 'transparent', border: '1px solid var(--b2)', borderRadius: 6, padding: '14px', color: 'var(--t2)', fontFamily: 'var(--font-head)', fontSize: 15, fontWeight: 700, letterSpacing: 2, cursor: 'pointer' }}>
                      NEW PLAYER
                    </button>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* RIGHT: Leaderboard */}
        <div style={{ borderLeft: '1px solid var(--b1)', background: 'var(--sidebar-bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--b1)', background: 'var(--bg2)', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: 4, color: 'var(--t3)', marginBottom: 2 }}>GLOBAL RANKINGS</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)' }}>Leaderboard</div>
            </div>
            <span style={{ fontSize: 9, letterSpacing: 2, padding: '2px 8px', borderRadius: 3, background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.25)', color: 'var(--c)' }}>
              {leaderboard.length} PLAYERS
            </span>
          </div>
          <Leaderboard leaderboard={leaderboard} />
        </div>
      </div>

      <Ticker topPlayer={topPlayer?.name} topPts={topPlayer?.totalPoints} totalPreds={leaderboard.length} />
    </div>
  );
}
