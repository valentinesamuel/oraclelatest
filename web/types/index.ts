export type MatchStatus = 'NOT_STARTED' | 'LIVE' | 'FINISHED' | 'POSTPONED' | 'VOID';
export type OracleVerdict = 'HOME_WIN' | 'AWAY_WIN' | 'DRAW';
export type Team = 'Team Budweiser' | 'Team Trophy';

export interface Fixture {
  id: number;
  name: string;
  startingAt: string; // ISO string
  homeTeamName: string;
  homeFlagUrl: string;
  awayTeamName: string;
  awayFlagUrl: string;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
  round: string | null;
  aiPreview: string | null;
}

export interface OraclePrediction {
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
  oracleVerdict: OracleVerdict;
}

export interface LeaderboardEntry {
  email: string;
  name: string;
  team: Team;
  totalPoints: number;
  rank: number;
}

export interface TeamStanding {
  team: Team;
  totalPoints: number;
}

export interface PredictResponse {
  oracle: OraclePrediction;
  fixture: Fixture;
}
