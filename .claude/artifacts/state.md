# State

## Current Phase
**Phase = 0** (not yet started; plan authored, awaiting execution approval)

## Phase Dependency Map
- Phase 0 (error class) → no deps. Must land first.
- Phase 1 (detect in fetchSportmonks) → depends on Phase 0.
- Phase 2 (fetchFixturesForDate) → depends on Phase 1.
- Phase 3 (fetchFixtureWithEvents propagate) → depends on Phase 1 (no code change, validation only).
- Phase 4 (match-poller) → depends on Phase 0, Phase 3.
- Phase 5 (scoring-engine) → depends on Phase 0, Phase 3.
- Phase 6 (tests) → depends on Phases 0-5.

Phases 2, 4, 5 are independent of each other and may run in parallel once 0/1/3 are done.

## Assumptions
- A1 — A genuine successful Sportmonks 200 response ALWAYS contains a `data` key (object or array). The detection predicate (`message` string + `subscription` array + no `data`) relies on this. Verified against the provided no-result sample and the existing `(data.data ?? [])` usage which assumes a `data` field on success.
- A2 — The "no data" and "no subscription" cases produce the identical envelope shape and are handled identically (Decision #6). No second predicate needed.
- A3 — `prisma` exposes `.jobQueue`, `.prediction`, `.leaderboard` (already used in the workers); model names map correctly via the generated client.
- A4 — Test harness exists under `server/` (Phase 6). If absent, Phase 6 escalates rather than scaffolds.
- A5 — TypeScript may transpile to a target where `extends Error` breaks `instanceof` without `Object.setPrototypeOf`; the class includes that guard defensively.

## Risks
- R1 (Medium) — **False positive detection.** A real response that lacks `data` but includes `message`+`subscription` would be misclassified. Mitigation: require all three predicate conditions; log the raw message so misclassification is visible in logs.
- R2 (Low) — **Orphaned JobQueue row.** If the not-found path in the poller does not update JobQueue status, the job may linger as `RUNNING`/`PENDING` and be re-enqueued. Mitigation: set status (see OQ-1).
- R3 (Low) — **Double onComplete / interval leak.** Mis-ordered control flow in Phase 4 could call `onComplete` twice or fail to clear the interval. Mitigation: mirror the exact `clearInterval → onComplete → return` pattern of existing branches; covered by INV-7 and Phase 4 tests.
- R4 (Low) — **Outer catch reclassification.** Forgetting the `instanceof` re-throw guard in the `fetchSportmonks` outer catch would log the not-found as a generic "request failed" error and could obscure it. Mitigation: explicit guard (Phase 1 step 4), covered by INV-3 and a Phase 1 test asserting single warn log.
- R5 (Low) — **Scoring engine variable scope.** Wrapping the line-17 fetch in try/catch must keep `rawFixture` in scope for the rest of the function. Mitigation: declare `let rawFixture` before the try (Phase 5 step 3).

## Open Questions
- **OQ-1 (BLOCKING-ish for Phase 4) — JobQueue status on not-found.** The `JobStatus` enum (`server/prisma/schema.prisma:19-25`) is `PENDING | RUNNING | COMPLETED | POSTPONED | VOID`. There is no `FAILED`/`NOT_FOUND`. Decision #4 specifies "clear interval, log error, onComplete" but is silent on JobQueue status. Options:
  - **A. Set status `VOID`** (recommended) — uses an existing enum value, marks the job terminal so it is not re-enqueued. Semantically "this fixture won't be processed." Pro: no migration. Con: conflates "match voided by competition" with "fixture not in our subscription"; observability relies on the error log to disambiguate.
  - **B. Add `FAILED` enum value + migration** — cleanest semantics, distinguishes the case. Pro: accurate. Con: requires a Prisma migration (schema change + deploy), broader blast radius, out of scope of the stated decisions.
  - **C. Leave status untouched** — only stop polling + onComplete. Pro: smallest change. Con: orphans the job row (R2); risks silent re-enqueue.
  - **Recommendation: A** for this change; raise B as a follow-up if "fixture not in subscription" needs to be reported distinctly. **Confirm with human before executing Phase 4.**
- **OQ-2 — Should `fetchFixturesForDate` returning `[]` trigger any alerting?** Currently just a warn log. If a whole date legitimately has zero fixtures vs. a subscription outage, both look identical. Likely acceptable for now; note for monitoring follow-up.
- **OQ-3 — Test framework.** Which runner (jest/vitest) and mocking style does `server/` use? Determines Phase 6 authoring. Resolve before Phase 6.
