'use client';

import { useState, useEffect } from 'react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'dark' | 'light' | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.dataset.theme = saved;
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem('theme', nextTheme);
  };

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      style={{
        position: 'fixed',
        top: 12,
        right: 12,
        zIndex: 1000,
        background: 'var(--bg2)',
        border: '1px solid var(--b2)',
        borderRadius: 6,
        padding: '6px 10px',
        color: 'var(--t2)',
        cursor: 'pointer',
        fontSize: 16,
        lineHeight: 1,
      }}
    >
      {theme === 'dark' ? '☀' : '☾'}
    </button>
  );
}
