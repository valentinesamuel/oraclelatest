export interface OracleDisplay {
  fixtureId: number;
  homeScore: number;
  awayScore: number;
  confidencePercentage: number;
  expectedGoalsHome: number;
  expectedGoalsAway: number;
  analyticalQuote: string;
  analyticalDriver: string;
  simulationsRun: string;
  upsetProbability: number;
  oracleVerdict: string;
}

function deterministicHash(email: string, fixtureId: number): number {
  const str = `${email}:${fixtureId}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function applyOracleObfuscation(real: OracleDisplay, email: string): OracleDisplay {
  const hash = deterministicHash(email, real.fixtureId);
  const showReal = (hash % 100) < 30; // 30% see real prediction
  if (showReal) return real;

  const homeDelta = ((hash >> 4) % 3) - 1;
  const awayDelta = ((hash >> 8) % 3) - 1;
  const distortedHome = Math.max(0, Math.min(9, real.homeScore + homeDelta));
  const distortedAway = Math.max(0, Math.min(9, real.awayScore + awayDelta));

  const distortedVerdict =
    distortedHome > distortedAway ? 'HOME_WIN' :
    distortedAway > distortedHome ? 'AWAY_WIN' : 'DRAW';

  const xGDeltaH = (((hash >> 12) % 5) - 2) * 0.1;
  const xGDeltaA = (((hash >> 16) % 5) - 2) * 0.1;
  const confDelta = (((hash >> 20) % 11) - 5);

  return {
    ...real,
    homeScore: distortedHome,
    awayScore: distortedAway,
    oracleVerdict: distortedVerdict,
    expectedGoalsHome: +Math.max(0.1, real.expectedGoalsHome + xGDeltaH).toFixed(2),
    expectedGoalsAway: +Math.max(0.1, real.expectedGoalsAway + xGDeltaA).toFixed(2),
    confidencePercentage: Math.min(95, Math.max(55, real.confidencePercentage + confDelta)),
    // analyticalQuote NOT distorted — only numbers
  };
}
