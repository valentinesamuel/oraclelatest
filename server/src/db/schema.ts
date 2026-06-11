import {
  pgTable,
  pgEnum,
  integer,
  serial,
  varchar,
  boolean,
  timestamp,
  jsonb,
  unique,
  index,
} from 'drizzle-orm/pg-core';

export const matchStatus = pgEnum('MatchStatus', [
  'NOT_STARTED',
  'LIVE',
  'FINISHED',
  'POSTPONED',
  'VOID',
]);

export const jobStatus = pgEnum('JobStatus', [
  'PENDING',
  'RUNNING',
  'COMPLETED',
  'POSTPONED',
  'VOID',
]);

export const fixture = pgTable('Fixture', {
  id: integer('id').primaryKey(),
  name: varchar('name').notNull(),
  startingAt: timestamp('startingAt', { mode: 'date' }).notNull(),
  homeTeamName: varchar('homeTeamName').notNull(),
  homeFlagUrl: varchar('homeFlagUrl').notNull(),
  awayTeamName: varchar('awayTeamName').notNull(),
  awayFlagUrl: varchar('awayFlagUrl').notNull(),
  homeScore: integer('homeScore'),
  awayScore: integer('awayScore'),
  status: matchStatus('status').default('NOT_STARTED').notNull(),
  leagueId: integer('leagueId').notNull(),
  seasonId: integer('seasonId').notNull(),
  stateId: integer('stateId').notNull(),
  round: varchar('round'),
  rawSportmonksData: jsonb('rawSportmonksData'),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
});

export const prediction = pgTable(
  'Prediction',
  {
    id: serial('id').primaryKey(),
    email: varchar('email').notNull(),
    name: varchar('name').notNull(),
    team: varchar('team').notNull(),
    matchDate: varchar('matchDate').notNull(),
    fixtureId: integer('fixtureId').notNull().references(() => fixture.id),
    guessHome: integer('guessHome').notNull(),
    guessAway: integer('guessAway').notNull(),
    firstScorer: varchar('firstScorer').default('').notNull(),
    processed: boolean('processed').default(false).notNull(),
    exactScorePoints: integer('exactScorePoints').default(0).notNull(),
    correctWinnerPoints: integer('correctWinnerPoints').default(0).notNull(),
    firstScorerPoints: integer('firstScorerPoints').default(0).notNull(),
    totalPoints: integer('totalPoints').default(0).notNull(),
    createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    emailFixtureUnique: unique('prediction_email_fixtureId_unique').on(table.email, table.fixtureId),
    fixtureProcessedIdx: index('prediction_fixtureId_processed_idx').on(table.fixtureId, table.processed),
  }),
);

export const leaderboard = pgTable(
  'Leaderboard',
  {
    email: varchar('email').primaryKey(),
    name: varchar('name').notNull(),
    team: varchar('team').notNull(),
    totalPoints: integer('totalPoints').default(0).notNull(),
    updatedAt: timestamp('updatedAt', { mode: 'date' }).notNull(),
  },
  (table) => ({
    totalPointsIdx: index('leaderboard_totalPoints_idx').on(table.totalPoints),
  }),
);

export const jobQueue = pgTable(
  'JobQueue',
  {
    id: serial('id').primaryKey(),
    fixtureId: integer('fixtureId').notNull().references(() => fixture.id),
    processAt: timestamp('processAt', { mode: 'date' }).notNull(),
    status: jobStatus('status').default('PENDING').notNull(),
    retryCount: integer('retryCount').default(0).notNull(),
    metadata: jsonb('metadata'),
    updatedAt: timestamp('updatedAt', { mode: 'date' }).notNull(),
  },
  (table) => ({
    fixtureIdUnique: unique('jobQueue_fixtureId_unique').on(table.fixtureId),
  }),
);

