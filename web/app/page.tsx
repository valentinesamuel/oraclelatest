// app/page.tsx — Home / navigation hub

import Link from 'next/link';
import Image from 'next/image';

export default function HomePage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
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
        <Image src="/ibplc-logo.png" alt="IBPLC" width={64} height={86} style={{ margin: '0 auto 16px', display: 'block' }} />
        <div style={{ fontSize: 52, fontWeight: 900, letterSpacing: 10, color: 'var(--c)', lineHeight: 1 }}>
          BATTLE OF THE BRANDS
        </div>
        <div style={{ fontSize: 12, letterSpacing: 5, color: 'var(--t3)', marginTop: 8 }}>
          FIFA WORLD CUP 2026 · AI PREDICTION ENGINE
        </div>
      </div>

      {/* Route cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, width: '100%', maxWidth: 560, zIndex: 1 }}>
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
              Kiosk / tablet view. Submit predictions, earn points.
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

      <div style={{ fontSize: 11, color: 'var(--t3)', letterSpacing: 3, zIndex: 1 }}>
        OPEN /arena ON TABLETS · /wall ON THE BIG SCREEN
      </div>
    </div>
  );
}
