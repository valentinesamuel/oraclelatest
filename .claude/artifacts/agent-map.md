# Agent Map

Agent pool: `.claude/agents/` (Tier-1). No `.claude/skills/` are installed in this project, so no reference-skill lookups are assigned.

Phases 0, 1, 3 are tightly coupled edits in the same file and are assigned together to one primary to avoid handoff churn.

## Phase 0 + 1 + 3: Error class, no-result detection, propagation (all in `server/src/lib/sportmonks.ts`)
**Primary:** typescript-pro — defines the typed error class with correct prototype handling and implements the shape-detection guard + outer-catch passthrough in the fetch wrapper.
**Review:** error-detective — validates the detection predicate has no false positives and that error identity/observability survives the outer catch.

## Phase 2: `fetchFixturesForDate` returns `[]` on not-found
**Primary:** backend-developer — adds the try/catch + warn log + empty-array return.

## Phase 4: `match-poller.ts` stop-polling on not-found
**Primary:** backend-developer — implements the not-found branch (clearInterval, error log, JobQueue status, onComplete) mirroring existing terminal branches.
**Review:** architect-reviewer — confirms poller lifecycle invariants (single clearInterval/onComplete, transient-error retry preserved) and the OQ-1 JobQueue status decision.

## Phase 5: `scoring-engine.ts` abort on not-found
**Primary:** backend-developer — wraps the fetch in try/catch, early-returns on not-found, re-throws other errors, preserves `rawFixture` scope.

## Phase 6: Regression tests
**Primary:** typescript-pro — authors unit tests for the four no-result paths using the existing `server/` test harness (escalates if none exists).
