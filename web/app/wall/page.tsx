'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Leaderboard from '../../components/Leaderboard';
import type { Fixture, LeaderboardEntry } from '../../types';

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

function FlagImg({ url, alt, size = 32 }: { url: string | null; alt: string; size?: number }) {
  if (!url) return <span style={{ fontSize: size * 0.7 }}>🏳</span>;
  return <img src={url} alt={alt} style={{ width: size, height: Math.round(size * 0.67), objectFit: 'cover', borderRadius: 2 }} />;
}

function StatusBadge({ fixture }: { fixture: Fixture }) {
  const live     = isLive(fixture);
  const finished = isFinished(fixture);
  const label    = statusLabel(fixture.status);
  const color    = live ? 'var(--red)' : finished ? 'var(--t3)' : 'var(--c3)';
  const bg       = live ? 'rgba(255,64,64,0.15)' : finished ? 'rgba(255,255,255,0.05)' : 'rgba(0,255,163,0.1)';
  return (
    <span style={{ fontSize: 9, letterSpacing: 2, color, background: bg, border: `1px solid ${color}`, padding: '2px 7px', borderRadius: 3, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      {live && <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, animation: 'pulse-dot 1s infinite', display: 'inline-block' }} />}
      {label.toUpperCase()}
    </span>
  );
}

export default function WallPage() {
  const [fixtures, setFixtures]       = useState<Fixture[]>([]);
  const [selectedId, setSelectedId]   = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [clock, setClock]             = useState('');
  const autoRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const curIdxRef  = useRef(0);

  const liveFixtures     = fixtures.filter(isLive);
  const predictable      = fixtures.filter(canPredict);
  const finishedFixtures = fixtures.filter(isFinished);
  const displayFixtures  = [...liveFixtures, ...predictable, ...finishedFixtures.slice(0, 5)];
  const selectedMatch    = fixtures.find(f => f.id === selectedId) ?? null;

  const fetchFixtures = useCallback(async () => {
    try {
      const res  = await fetch('/api/fixtures');
      const data = await res.json();
      setFixtures((data.fixtures ?? []).map((f: any) => ({
        ...f,
        startingAt: typeof f.startingAt === 'string' ? f.startingAt : new Date(f.startingAt).toISOString(),
      })));
    } catch { /* silent */ }
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res  = await fetch('/api/leaderboard');
      const data = await res.json();
      setLeaderboard(data.leaderboard ?? []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchFixtures(); fetchLeaderboard(); }, []);
  useEffect(() => { const t = setInterval(fetchFixtures, 30_000);    return () => clearInterval(t); }, [fetchFixtures]);
  useEffect(() => { const t = setInterval(fetchLeaderboard, 30_000); return () => clearInterval(t); }, [fetchLeaderboard]);

  useEffect(() => {
    const tick = () => {
      const n = new Date();
      setClock([n.getHours(), n.getMinutes(), n.getSeconds()].map(x => String(x).padStart(2,'0')).join(':'));
    };
    tick(); const t = setInterval(tick, 1000); return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (fixtures.length > 0 && selectedId === null) {
      const live     = fixtures.find(isLive);
      const upcoming = fixtures.find(canPredict);
      const first    = live ?? upcoming ?? fixtures[0];
      if (first) { setSelectedId(first.id); curIdxRef.current = displayFixtures.indexOf(first); }
    }
  }, [fixtures, selectedId]);

  const startAuto = useCallback(() => {
    if (autoRef.current) clearInterval(autoRef.current);
    if (displayFixtures.length === 0) return;
    autoRef.current = setInterval(() => {
      curIdxRef.current = (curIdxRef.current + 1) % displayFixtures.length;
      setSelectedId(displayFixtures[curIdxRef.current].id);
    }, 9000);
  }, [displayFixtures]);

  useEffect(() => { startAuto(); return () => { if (autoRef.current) clearInterval(autoRef.current); }; }, [startAuto]);

  const handleSelect = (id: number) => {
    curIdxRef.current = displayFixtures.findIndex(f => f.id === id);
    setSelectedId(id);
    startAuto();
  };

  const topPlayer = leaderboard[0];

  return (
    <div style={{ width: '100vw', height: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ position: 'fixed', inset: 0, opacity: 0.03, pointerEvents: 'none', zIndex: 0, backgroundImage: 'linear-gradient(var(--c) 1px,transparent 1px),linear-gradient(90deg,var(--c) 1px,transparent 1px)', backgroundSize: '80px 80px' }} />
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1, background: 'radial-gradient(ellipse at center,transparent 25%,var(--vignette) 100%)' }} />

      {/* TOP BAR */}
      <div style={{ height: 72, flexShrink: 0, background: 'var(--header-bg)', borderBottom: '1px solid var(--b2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 46, height: 46, clipPath: 'polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)', background: 'var(--c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900, color: '#000' }}>O</div>
          <div>
            <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: 8, color: 'var(--c)', lineHeight: 1 }}>BATTLE OF THE BRANDS</div>
            <div style={{ fontSize: 10, letterSpacing: 5, color: 'var(--t3)' }}>FIFA WORLD CUP 2026 · LIVE PREDICTION ARENA · CAN YOU BEAT THE AI?</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {[
            { val: String(leaderboard.length), key: 'PREDICTIONS', c: 'var(--c3)' },
            { val: String(liveFixtures.length), key: 'LIVE NOW', c: liveFixtures.length > 0 ? 'var(--red)' : 'var(--t3)' },
            { val: String(finishedFixtures.length), key: 'RESULTS', c: 'var(--gold)' },
            { val: String(predictable.length), key: 'TO PREDICT', c: 'var(--c3)' },
          ].map(({ val, key, c }) => (
            <div key={key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--bg3)', border: '1px solid var(--b1)', padding: '5px 16px', borderRadius: 4 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color: c, lineHeight: 1 }}>{val}</div>
              <div style={{ fontSize: 9, letterSpacing: 3, color: 'var(--t3)', marginTop: 2 }}>{key}</div>
            </div>
          ))}
          {liveFixtures.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,64,64,0.12)', border: '1px solid rgba(255,64,64,0.4)', padding: '8px 16px', borderRadius: 4 }}>
              <div style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--red)', animation: 'pulse-dot 1.2s infinite' }} />
              <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: 3, color: '#ff7070' }}>LIVE</span>
            </div>
          )}
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 600, color: 'var(--t2)', letterSpacing: 2 }}>{clock}</div>
        </div>
      </div>

      {/* MAIN GRID */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '300px 1fr 300px', minHeight: 0, position: 'relative', zIndex: 5 }}>

        {/* LEFT: Fixture list */}
        <div style={{ borderRight: '1px solid var(--b1)', background: 'var(--sidebar-bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--b1)', background: 'var(--bg2)', display: 'flex', justifyContent: 'space-between', flexShrink: 0 }}>
            <span style={{ fontSize: 10, letterSpacing: 4, color: 'var(--t3)' }}>FIXTURES &amp; SCORES</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {liveFixtures.map(f => (
              <div key={f.id} onClick={() => handleSelect(f.id)} style={{ padding: '10px 14px', borderBottom: '1px solid var(--b1)', borderLeft: `3px solid ${f.id === selectedId ? 'var(--red)' : 'transparent'}`, background: f.id === selectedId ? 'rgba(255,64,64,0.06)' : 'rgba(255,64,64,0.03)', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 9, color: 'var(--t3)' }}>{f.round ?? 'Group Stage'}</span>
                  <StatusBadge fixture={f} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FlagImg url={f.homeFlagUrl} alt={f.homeTeamName} size={20} />
                  <span style={{ fontSize: 12, fontWeight: 700, flex: 1 }}>{f.homeTeamName.toUpperCase()}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 900, color: 'var(--red)', padding: '0 4px' }}>
                    {f.homeScore ?? 0} – {f.awayScore ?? 0}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, flex: 1, textAlign: 'right' }}>{f.awayTeamName.toUpperCase()}</span>
                  <FlagImg url={f.awayFlagUrl} alt={f.awayTeamName} size={20} />
                </div>
              </div>
            ))}
            {predictable.map(f => (
              <div key={f.id} onClick={() => handleSelect(f.id)} style={{ padding: '10px 14px', borderBottom: '1px solid var(--b1)', borderLeft: `3px solid ${f.id === selectedId ? 'var(--c)' : 'transparent'}`, background: f.id === selectedId ? 'rgba(0,212,255,0.07)' : 'transparent', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 9, color: 'var(--t3)' }}>{f.round ?? 'Group Stage'}</span>
                  <StatusBadge fixture={f} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FlagImg url={f.homeFlagUrl} alt={f.homeTeamName} size={20} />
                  <span style={{ fontSize: 12, fontWeight: 700, flex: 1 }}>{f.homeTeamName.toUpperCase()}</span>
                  <span style={{ fontSize: 10, color: 'var(--t3)', padding: '0 8px' }}>
                    {new Date(f.startingAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, flex: 1, textAlign: 'right' }}>{f.awayTeamName.toUpperCase()}</span>
                  <FlagImg url={f.awayFlagUrl} alt={f.awayTeamName} size={20} />
                </div>
                <div style={{ fontSize: 8, color: 'var(--t3)', marginTop: 4 }}>
                  {new Date(f.startingAt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                </div>
              </div>
            ))}
            {finishedFixtures.slice(0, 5).map(f => (
              <div key={f.id} onClick={() => handleSelect(f.id)} style={{ padding: '10px 14px', borderBottom: '1px solid var(--b1)', borderLeft: `3px solid ${f.id === selectedId ? 'var(--t3)' : 'transparent'}`, opacity: 0.7, cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 9, color: 'var(--t3)' }}>{f.round ?? 'Group Stage'}</span>
                  <StatusBadge fixture={f} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FlagImg url={f.homeFlagUrl} alt={f.homeTeamName} size={20} />
                  <span style={{ fontSize: 12, fontWeight: 700, flex: 1 }}>{f.homeTeamName.toUpperCase()}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 900, color: 'var(--t2)', padding: '0 4px' }}>
                    {f.homeScore} – {f.awayScore}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, flex: 1, textAlign: 'right' }}>{f.awayTeamName.toUpperCase()}</span>
                  <FlagImg url={f.awayFlagUrl} alt={f.awayTeamName} size={20} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CENTER: Featured match */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 30px', position: 'relative', overflow: 'hidden' }}>
          {selectedMatch && (() => {
            const live     = isLive(selectedMatch);
            const finished = isFinished(selectedMatch);
            const predict  = canPredict(selectedMatch);
            return (
              <>
                <div style={{ position: 'absolute', fontSize: 280, fontWeight: 900, color: 'rgba(0,212,255,0.025)', letterSpacing: -20, userSelect: 'none', pointerEvents: 'none', lineHeight: 1, zIndex: 0 }}>
                  {(live || finished)
                    ? `${selectedMatch.homeScore ?? 0}—${selectedMatch.awayScore ?? 0}`
                    : 'VS'}
                </div>

                {live && (
                  <div style={{ width: '100%', maxWidth: 560, marginBottom: 14, zIndex: 2, background: 'rgba(255,64,64,0.1)', border: '1px solid rgba(255,64,64,0.5)', borderRadius: 6, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--red)', animation: 'pulse-dot 1s infinite', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 2, color: 'var(--red)', marginBottom: 2 }}>MATCH IN PROGRESS — PREDICTIONS LOCKED</div>
                      <div style={{ fontSize: 11, color: 'var(--t2)' }}>Live: {selectedMatch.homeTeamName} vs {selectedMatch.awayTeamName}</div>
                    </div>
                  </div>
                )}

                <div style={{ width: '100%', maxWidth: 560, background: 'var(--bg2)', border: `1px solid ${live ? 'rgba(255,64,64,0.4)' : 'var(--b2)'}`, borderRadius: 10, padding: '22px 26px', position: 'relative', zIndex: 2 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <span style={{ fontSize: 10, letterSpacing: 3, color: 'var(--t3)' }}>
                      {selectedMatch.round ?? 'Group Stage'} · {new Date(selectedMatch.startingAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <StatusBadge fixture={selectedMatch} />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                    <div style={{ textAlign: 'center', flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                        <FlagImg url={selectedMatch.homeFlagUrl} alt={selectedMatch.homeTeamName} size={52} />
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 3 }}>{selectedMatch.homeTeamName.toUpperCase()}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 12px' }}>
                      {(live || finished) && selectedMatch.homeScore !== null ? (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ fontSize: 80, fontWeight: 900, color: live ? 'var(--red)' : 'var(--t1)', letterSpacing: -4, lineHeight: 1 }}>{selectedMatch.homeScore}</span>
                            <span style={{ fontSize: 40, fontWeight: 300, color: 'var(--t3)', margin: '0 4px' }}>—</span>
                            <span style={{ fontSize: 80, fontWeight: 900, color: live ? 'var(--red)' : 'var(--t1)', letterSpacing: -4, lineHeight: 1 }}>{selectedMatch.awayScore}</span>
                          </div>
                          <div style={{ fontSize: 9, letterSpacing: 3, color: live ? 'var(--red)' : 'var(--t3)', marginTop: 4 }}>
                            {live ? 'LIVE SCORE' : 'FINAL SCORE'}
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 4, color: 'var(--t3)' }}>VS</div>
                          <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 8, letterSpacing: 2 }}>
                            {new Date(selectedMatch.startingAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} WAT
                          </div>
                        </>
                      )}
                    </div>
                    <div style={{ textAlign: 'center', flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                        <FlagImg url={selectedMatch.awayFlagUrl} alt={selectedMatch.awayTeamName} size={52} />
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 3 }}>{selectedMatch.awayTeamName.toUpperCase()}</div>
                    </div>
                  </div>

                  {predict && (
                    <div style={{ background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 6, padding: '10px 14px', textAlign: 'center' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--c)', marginBottom: 4 }}>PREDICTIONS OPEN</div>
                      <div style={{ fontSize: 11, color: 'var(--t2)' }}>Use a tablet to predict this match. Points awarded at Full Time against the real result.</div>
                    </div>
                  )}
                  {finished && (
                    <div style={{ background: 'rgba(0,255,163,0.04)', border: '1px solid rgba(0,255,163,0.2)', borderRadius: 6, padding: '10px 14px', textAlign: 'center' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--c3)', marginBottom: 2 }}>MATCH COMPLETE · POINTS AWARDED</div>
                      <div style={{ fontSize: 11, color: 'var(--t2)' }}>Leaderboard updated with final results</div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 16, zIndex: 2 }}>
                  {displayFixtures.map(f => (
                    <div key={f.id} onClick={() => handleSelect(f.id)} style={{ width: 9, height: 9, borderRadius: '50%', cursor: 'pointer', transition: 'all 0.3s', background: f.id === selectedId ? (isLive(f) ? 'var(--red)' : 'var(--c)') : 'var(--b2)', border: `1px solid ${f.id === selectedId ? (isLive(f) ? 'var(--red)' : 'var(--c)') : 'var(--b2)'}`, transform: f.id === selectedId ? 'scale(1.4)' : 'scale(1)' }} />
                  ))}
                </div>
              </>
            );
          })()}
        </div>

        {/* RIGHT: Leaderboard */}
        <div style={{ borderLeft: '1px solid var(--b1)', background: 'var(--sidebar-bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--b1)', background: 'var(--bg2)', display: 'flex', justifyContent: 'space-between', flexShrink: 0 }}>
            <span style={{ fontSize: 10, letterSpacing: 4, color: 'var(--t3)' }}>LIVE LEADERBOARD</span>
            <span style={{ fontSize: 9, letterSpacing: 2, padding: '2px 8px', borderRadius: 3, background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.25)', color: 'var(--c)' }}>
              {leaderboard.length} PLAYERS
            </span>
          </div>
          <Leaderboard leaderboard={leaderboard} />
        </div>
      </div>

      {/* CTA strip */}
      <div style={{ flexShrink: 0, background: 'rgba(0,212,255,0.06)', borderTop: '1px solid rgba(0,212,255,0.2)', padding: '8px 28px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
        <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: 3 }}>
          SCAN TO PREDICT <span style={{ color: 'var(--c)' }}>·</span> BEAT THE AI <span style={{ color: 'var(--c)' }}>·</span> POINTS AWARDED AT FULL TIME
        </div>
        <div style={{ width: 1, height: 24, background: 'var(--b2)' }} />
        <div style={{ display: 'flex', gap: 14 }}>
          {[['50','EXACT SCORE'],['20','CORRECT WINNER'],['30','UPSET BONUS'],['10','FIRST SCORER']].map(([val,label]) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <span style={{ display: 'block', fontSize: 18, fontWeight: 900, color: 'var(--gold)', lineHeight: 1 }}>{val}</span>
              <span style={{ fontSize: 8, letterSpacing: 2, color: 'var(--t3)' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Ticker */}
      <div style={{ flexShrink: 0, height: 40, background: 'var(--bg2)', borderTop: '1px solid var(--b1)', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
        <div style={{ padding: '0 16px', height: '100%', display: 'flex', alignItems: 'center', borderRight: '1px solid var(--b1)', fontSize: 9, letterSpacing: 3, color: 'var(--c)', fontWeight: 700, whiteSpace: 'nowrap' }}>
          ORACLE LIVE FEED
        </div>
        <div style={{ flex: 1, overflow: 'hidden', height: '100%', display: 'flex', alignItems: 'center' }}>
          <div style={{ whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--t3)', animation: 'ticker-scroll 60s linear infinite', display: 'inline-block' }}>
            {(() => {
              const items = [
                ...liveFixtures.map(f => `⚡ LIVE: ${f.homeTeamName.toUpperCase()} ${f.homeScore ?? 0}–${f.awayScore ?? 0} ${f.awayTeamName.toUpperCase()}`),
                ...finishedFixtures.map(f => `FT: ${f.homeTeamName.toUpperCase()} ${f.homeScore}–${f.awayScore} ${f.awayTeamName.toUpperCase()}`),
                ...predictable.slice(0,4).map(f => `NEXT: ${f.homeTeamName.toUpperCase()} vs ${f.awayTeamName.toUpperCase()} · ${new Date(f.startingAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ${new Date(f.startingAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} WAT`),
                topPlayer ? `TOP PREDICTOR: ${topPlayer.name} — ${topPlayer.totalPoints} PTS` : null,
                'ORACLE AI PREDICTION ENGINE · Points awarded automatically at Full Time',
                'GRAND PRIZE: BEAT THE AI CHAMPION TROPHY · END OF DAY CEREMONY',
              ].filter(Boolean).join('   ·   ');
              return items + '   ·   ' + items;
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
