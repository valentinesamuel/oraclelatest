export type MatchStatus = 'NOT_STARTED' | 'LIVE' | 'FINISHED' | 'POSTPONED' | 'VOID';
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

