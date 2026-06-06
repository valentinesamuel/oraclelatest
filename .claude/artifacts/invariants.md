# Invariants

System-wide rules that MUST hold throughout and after this change.

- **INV-1 — Single detection point.** The no-result 200 shape is detected in exactly one place: `fetchSportmonks` (`server/src/lib/sportmonks.ts`). No caller may re-implement string/shape matching on the raw payload. Callers branch only on `instanceof SportmonksNotFoundError`.

- **INV-2 — No corrupted shape escapes the boundary.** No function may ever return the `{ message, subscription, rate_limit, timezone }` envelope cast as `SportmonksFixture` / `{ data: ... }`. If `data` is absent in a 200 body, the call must throw, never return.

- **INV-3 — Error identity is preserved.** A `SportmonksNotFoundError` thrown inside `fetchSportmonks` must reach callers as the same class (correct `instanceof`), never wrapped, re-typed, or downgraded to a generic `Error` by the outer catch (`sportmonks.ts:139-154`).

- **INV-4 — Distinguish "not found" from "real failure".** Genuine HTTP errors (`!res.ok`) and network/parse failures must continue to throw plain `Error` and must NOT be classified as `SportmonksNotFoundError`. Callers must re-throw non-`SportmonksNotFoundError` errors rather than swallowing them.

- **INV-5 — No secret or full-payload logging.** `console.log(token)` (`sportmonks.ts:87`) and `console.log(JSON.stringify(response))` (`sportmonks.ts:137`) must be removed. Logging goes only through `sportmonksLogger`. The API token must never be written to stdout/logs.

- **INV-6 — Observability on every no-result.** Every no-result detection emits exactly one structured log containing at minimum `path` and the raw `apiMessage` (and `requestedEntity` when present), at the level prescribed per layer: `warn` in `fetchSportmonks` and `fetchFixturesForDate`; `error` in `match-poller` and `scoring-engine`. No duplicate logging of the same event across layers beyond the prescribed per-layer line.

- **INV-7 — Poller lifecycle integrity.** `clearInterval(interval)` and `onComplete()` must each be called at most once per poller lifecycle. The not-found branch must `clearInterval` then `onComplete` then `return`, matching the existing terminal/void/postponed/suspended branches. The poller must NOT continue polling after a not-found.

- **INV-8 — Scoring atomicity unaffected.** The not-found early-return in `scoring-engine` occurs strictly before any `prisma` write or transaction. No partial scoring, no leaderboard mutation, no JobQueue status change may occur on a not-found.

- **INV-9 — Transient errors still retry.** A generic (non-not-found) error in the poller must NOT clear the interval — the poller continues so transient API/network blips self-heal.

- **INV-10 — API contract stability.** Public signatures of `fetchFixturesForDate(dateStr): Promise<MappedFixture[]>` and `fetchFixtureWithEvents(fixtureId): Promise<SportmonksFixture>` are unchanged. Only their failure modes are tightened (the latter may now reject with `SportmonksNotFoundError`).

- **INV-11 — DB write resilience.** Any JobQueue status update added to the not-found path must not prevent `onComplete()` from firing if the DB write fails (wrap in its own try/catch).
