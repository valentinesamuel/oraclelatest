import { sportmonksLogger } from "./logger";

const BASE_URL = "https://api.sportmonks.com/v3/football";

export class SportmonksNotFoundError extends Error {
  constructor(
    public readonly path: string,
    public readonly apiMessage: string,
    public readonly requestedEntity?: string,
  ) {
    super(`Sportmonks ${path} → no result: ${apiMessage}`);
    this.name = "SportmonksNotFoundError";
    Object.setPrototypeOf(this, SportmonksNotFoundError.prototype);
  }
}

const STATE_MAP: Record<number, string> = {
  1: "NOT_STARTED",
  2: "LIVE",
  3: "LIVE",
  4: "LIVE",
  6: "LIVE",
  9: "LIVE",
  5: "FINISHED", // FT      — full time after 90 min
  7: "FINISHED", // AET     — after extra time
  8: "FINISHED", // FT_PEN  — full time after penalties
  10: "POSTPONED",
  11: "POSTPONED", // SUSPENDED — will continue later
  12: "VOID", // CANCELLED — permanently cancelled
  13: "NOT_STARTED", // TBA    — date not yet confirmed
  14: "VOID", // WO     — walkover, no match played
  15: "POSTPONED", // ABANDONED — may resume later
};

export const TERMINAL_STATE_IDS = [5, 7, 8];
export const POSTPONED_STATE_IDS = [10];
export const VOID_STATE_IDS = [12, 14];
export const SUSPENDED_STATE_IDS = [11, 15];
export const GOAL_TYPE_IDS = [14, 16];

interface SportmonksParticipant {
  id: number;
  name: string;
  image_path: string;
  meta: { location: "home" | "away"; winner: boolean | null; position: number };
}

interface SportmonksGroup {
  id: number;
  name: string;
}

export interface SportmonksEvent {
  id: number;
  fixture_id: number;
  type_id: number;
  player_name: string;
  minute: number;
  result?: string;
  addition?: string;
}

export interface SportmonksFixture {
  id: number;
  name: string;
  league_id: number;
  season_id: number;
  state_id: number;
  starting_at: string;
  starting_at_timestamp: number;
  participants: SportmonksParticipant[];
  group?: SportmonksGroup | null;
  events?: SportmonksEvent[];
}

export interface MappedFixture {
  id: number;
  name: string;
  startingAt: Date;
  homeTeamName: string;
  homeFlagUrl: string;
  awayTeamName: string;
  awayFlagUrl: string;
  leagueId: number;
  seasonId: number;
  stateId: number;
  round: string | null;
  status: string;
  kickoffTimestamp: number;
  rawSportmonksData: SportmonksFixture;
}

async function fetchSportmonks<T>(path: string): Promise<T> {
  const token = process.env.SPORTMONKS_API_TOKEN;
  const url = `${BASE_URL}${path}`;
  const t0 = Date.now();

  sportmonksLogger.debug({ path }, "Sportmonks API call start");
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `${token}`,
        "Content-Type": "application/json",
      },
    });

    const latencyMs = Date.now() - t0;

    if (!res.ok) {
      // Attempt to extract error details from the response body
      let errorBody: unknown;
      let errorMessage: string;

      try {
        errorBody = await res.json();
        // Common Sportmonks error structures: { error: { message } } or { message }
        errorMessage =
          (errorBody as any)?.error?.message ||
          (errorBody as any)?.message ||
          `HTTP ${res.status} - ${res.statusText}`;
      } catch {
        // If response is not JSON, fallback to text
        errorBody = await res.text();
        errorMessage = errorBody
          ? String(errorBody)
          : `HTTP ${res.status} - ${res.statusText}`;
      }

      sportmonksLogger.error(
        {
          path,
          statusCode: res.status,
          latencyMs,
          errorBody,
        },
        `Sportmonks API error: ${errorMessage}`,
      );

      throw new Error(`Sportmonks ${path} → ${res.status}: ${errorMessage}`);
    }

    sportmonksLogger.debug(
      { path, statusCode: res.status, latencyMs },
      "Sportmonks API success",
    );

    const response = await res.json();

    if (
      response !== null &&
      typeof response === "object" &&
      typeof (response as any).message === "string" &&
      Array.isArray((response as any).subscription) &&
      !("data" in (response as any))
    ) {
      const requestedEntity = (response as any).rate_limit?.requested_entity;
      sportmonksLogger.warn(
        {
          path,
          apiMessage: (response as any).message,
          requestedEntity,
          rateLimit: (response as any).rate_limit,
        },
        "Sportmonks returned 200 with no result",
      );
      throw new SportmonksNotFoundError(
        path,
        (response as any).message,
        requestedEntity,
      );
    }

    return response as T;
  } catch (err) {
    if (err instanceof SportmonksNotFoundError) throw err;

    // Handle network errors or any other fetch failures
    const latencyMs = Date.now() - t0;
    const error = err instanceof Error ? err : new Error(String(err));

    sportmonksLogger.error(
      {
        path,
        latencyMs,
        errorMessage: error.message,
      },
      "Sportmonks API request failed (network or parsing error)",
    );

    throw error;
  }
}

export function mapFixture(raw: SportmonksFixture): MappedFixture {
  const home = raw.participants.find((p) => p.meta.location === "home");
  const away = raw.participants.find((p) => p.meta.location === "away");
  if (!home || !away)
    throw new Error(`Missing participants for fixture ${raw.id}`);

  return {
    id: raw.id,
    name: raw.name,
    startingAt: new Date(raw.starting_at.replace(" ", "T") + "Z"),
    homeTeamName: home.name,
    homeFlagUrl: home.image_path,
    awayTeamName: away.name,
    awayFlagUrl: away.image_path,
    leagueId: raw.league_id,
    seasonId: raw.season_id,
    stateId: raw.state_id,
    round: raw.group?.name ?? null,
    status: STATE_MAP[raw.state_id] ?? "NOT_STARTED",
    kickoffTimestamp: raw.starting_at_timestamp,
    rawSportmonksData: raw,
  };
}

export async function fetchFixturesForDate(
  dateStr: string,
): Promise<MappedFixture[]> {
  const leagueId = process.env.SPORTMONKS_LEAGUE_ID;
  const path = `/fixtures/date/${dateStr}?include=participants;group&filters=fixtureLeagues:${leagueId}`;
  try {
    const data = await fetchSportmonks<{ data: SportmonksFixture[] }>(path);
    return (data.data ?? []).map(mapFixture);
  } catch (err) {
    if (err instanceof SportmonksNotFoundError) {
      sportmonksLogger.warn(
        { dateStr, path, apiMessage: err.apiMessage },
        "No fixtures returned for date",
      );
      return [];
    }
    throw err;
  }
}

export async function fetchFixtureWithEvents(
  fixtureId: number,
): Promise<{ data: SportmonksFixture }> {
  const leagueId = process.env.SPORTMONKS_LEAGUE_ID;
  const path = `/fixtures/${fixtureId}?include=participants;scores;events&filters=fixtureLeagues:${leagueId}`;
  const data = await fetchSportmonks<{ data: SportmonksFixture }>(path);

  return data;
}

export function extractFirstScorer(events: SportmonksEvent[]): string | null {
  const goals = events
    .filter((e) => GOAL_TYPE_IDS.includes(e.type_id))
    .sort((a, b) => a.minute - b.minute);
  return goals[0]?.player_name?.trim() ?? null;
}
