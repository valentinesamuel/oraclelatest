// app/page.tsx — Home / navigation hub

import Link from 'next/link';
import Image from 'next/image';

export default function HomePage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '2rem',
      padding: '2rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Grid background */}
      <div style={{
        position: 'fixed', inset: 0, opacity: 0.03, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(var(--c) 1px, transparent 1px), linear-gradient(90deg, var(--c) 1px, transparent 1px)',
        backgroundSize: '80px 80px',
      }} />

      {/* Logo */}
      <div style={{ textAlign: 'center', zIndex: 1 }}>
        <Image src="/WORLD%20CUP%20CROPPED.png" alt="FIFA World Cup 2026" width={320} height={110} style={{ margin: '0 auto 24px', display: 'block', maxWidth: '80vw', height: 'auto' }} />
        <div className="title-xl" style={{ fontWeight: 900, color: 'var(--c)', lineHeight: 1 }}>
          BATTLE OF THE BRANDS
        </div>
        <div style={{ fontSize: 12, letterSpacing: 5, color: 'var(--t3)', marginTop: 8 }}>
          FIFA WORLD CUP 2026 · PREDICTION ENGINE
        </div>
      </div>

      {/* Route cards */}
      <div className="resp-grid-1col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, width: '100%', maxWidth: 560, zIndex: 1 }}>
        <Link href="/arena" style={{ textDecoration: 'none' }}>
          <div style={{
            background: 'var(--bg2)', border: '1px solid var(--b2)', borderRadius: 8,
            padding: '24px 20px', cursor: 'pointer', transition: 'all 0.2s',
            borderTop: '3px solid var(--c)',
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>⚡</div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: 2, color: 'var(--t1)', marginBottom: 6 }}>
              PREDICTION ARENA
            </div>
            <div style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.4 }}>
              Submit predictions, earn points.
            </div>
          </div>
        </Link>

        <Link href="/wall" style={{ textDecoration: 'none' }}>
          <div style={{
            background: 'var(--bg2)', border: '1px solid var(--b2)', borderRadius: 8,
            padding: '24px 20px', cursor: 'pointer', transition: 'all 0.2s',
            borderTop: '3px solid var(--gold)',
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📺</div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: 2, color: 'var(--t1)', marginBottom: 6 }}>
              ATTRACTION WALL
            </div>
            <div style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.4 }}>
              Large screen display. Live leaderboard.
            </div>
          </div>
        </Link>
      </div>

      <div className="resp-hide-mobile" style={{ fontSize: 11, color: 'var(--t3)', letterSpacing: 3, zIndex: 1 }}>
        OPEN /arena ON TABLETS · /wall ON THE BIG SCREEN
      </div>
    </div>
  );
}
