# ORACLE — World Cup 2026 Live Prediction Arena

> Real-time AI-powered football prediction experience, powered by **API-Football** for live scores and **Claude AI** for ORACLE's personality.

---

## Quick Start

### 1. Install
```bash
npm install
```

### 2. Configure `.env.local`
```
ANTHROPIC_API_KEY=your_key        # https://console.anthropic.com
API_FOOTBALL_KEY=your_key         # https://www.api-football.com
API_FOOTBALL_LEAGUE_ID=1          # 1 = FIFA World Cup
API_FOOTBALL_SEASON=2026
```

### 3. Run
```bash
npm run dev
```

| URL | Purpose | Device |
|-----|---------|--------|
| `/arena` | Prediction kiosk | Tablet / touchscreen |
| `/wall`  | Attraction wall  | Large TV / projector |

---

## How Live Data Works

### API-Football Integration
- **Startup** → full fixture sync (all World Cup 2026 matches)
- **Every 60s** → live score updates (only during active matches)
- **Every 5m** → today's fixtures (status changes, kick-off confirmation)
- **Every 6h** → full fixture refresh

### Prediction Locking
- Predictions are only available when `status === 'NS'` (not started)
- At kick-off, the fixture transitions to `1H` — the API immediately rejects new predictions
- The arena fixture list shows a 🔒 lock indicator on started/finished matches

### Auto-Scoring at Full Time
When any match transitions to `FT` / `AET` / `PEN`:
1. The sync layer detects the status change
2. All unscored predictions for that match are evaluated against the **real result**
3. Points are calculated and applied to the leaderboard automatically
4. No staff intervention required

### Scoring
| Result | Points |
|--------|--------|
| Exact scoreline | **+50** |
| Correct winner / draw | **+20** |
| Away team wins (upset bonus) | **+30** |
| First scorer named | **+10** |

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/fixtures` | GET | All fixtures (filter=live/upcoming/finished) |
| `/api/live` | GET | Live + recent + next 3 upcoming |
| `/api/predict` | POST | Submit prediction → get ORACLE response |
| `/api/leaderboard` | GET/POST | Leaderboard read/write |
| `/api/sync?type=all` | POST | Manual fixture sync trigger |

---

## API-Football Free vs Paid

| Tier | Requests/day | Price | Suitable for |
|------|-------------|-------|--------------|
| Free | 100/day | Free | Dev + testing |
| Basic | Unlimited | ~$10/mo | Conference day (recommended) |

During a match day with 3 games, you'll use ~150–200 requests (60s polling × match duration). **Free tier is not enough for live event use.** Basic plan is sufficient.

---

## Production Deployment

### Vercel (recommended)
```bash
npx vercel --prod
```
Add all env vars in Vercel dashboard. The in-memory store resets on cold starts — for persistence use **Vercel KV** or **Upstash Redis**.

### Persistent storage (replace in-memory)
The `lib/live-store.ts` arrays (`fixtures`, `predictions`, `leaderboard`) are the swap points.

**Upstash Redis example:**
```ts
import { Redis } from '@upstash/redis'
const redis = new Redis({ url: '...', token: '...' })
await redis.set('leaderboard', JSON.stringify(leaderboard))
```

---

## Project Structure
```
oracle-arena/
├── lib/
│   ├── football-api.ts    ← API-Football client + types
│   ├── live-store.ts      ← In-memory fixtures, predictions, auto-scoring
│   └── scheduler.ts       ← Background sync jobs
├── app/
│   ├── arena/page.tsx     ← Prediction kiosk (blind submit → reveal)
│   ├── wall/page.tsx      ← Attraction wall with live scores
│   └── api/
│       ├── fixtures/      ← GET all fixtures
│       ├── live/          ← GET live scores (polled every 30s)
│       ├── predict/       ← POST prediction → Claude response
│       ├── leaderboard/   ← GET/POST leaderboard
│       └── sync/          ← POST manual sync trigger
└── components/
    ├── Leaderboard.tsx
    └── Ticker.tsx
```
