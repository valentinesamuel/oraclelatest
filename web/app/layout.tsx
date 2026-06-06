// app/layout.tsx

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ORACLE — World Cup 2026 Prediction Engine',
  description: 'Can you beat the AI? Predict World Cup 2026 match outcomes and challenge ORACLE.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
