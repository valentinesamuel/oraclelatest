// app/layout.tsx

import type { Metadata } from 'next';
import './globals.css';
import ThemeToggle from '../components/ThemeToggle';

export const metadata: Metadata = {
  title: 'BATTLE OF THE BRANDS',
  description: 'Can you beat the AI? Predict World Cup 2026 match outcomes and challenge ORACLE.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              var saved = localStorage.getItem('theme') || 'dark';
              document.documentElement.dataset.theme = saved;
            } catch (e) {
              document.documentElement.dataset.theme = 'dark';
            }
          })();
        `}} />
      </head>
      <body>
        <ThemeToggle />
        {children}
      </body>
    </html>
  );
}
