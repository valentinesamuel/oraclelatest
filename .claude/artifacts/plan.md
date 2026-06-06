# Plan: Handle Sportmonks HTTP 200 "No Result" Responses

## Problem Summary

`Sportmonks` API intermittently returns HTTP 200 with a payload that has **no `data` field**:

```json
{
  "message": "No result(s) found matching your request. ...",
  "subscription": [...],
  "rate_limit": { "resets_in_seconds": 3533, "remaining": 2497, "requested_entity": "Fixture" },
  "timezone": "UTC"
}
```

Because `res.ok` is `true`, the current `fetchSportmonks<T>` returns this object cast to `T`. Downstream:
- `fetchFixtureWithEvents` returns it directly → callers read `undefined` for `id`, `state_id`, `events`, `starting_at`, etc.
- `match-poller.ts` reads `raw.state_id` (`undefined`), matches no branch, falls through to live-score logic that reads `raw.events` (`undefined` → `[]`) — silently does nothing and keeps polling forever.
- `scoring-engine.ts` reads `rawFixture.state_id` (`undefined`), fails the `TERMINAL_STATE_IDS.includes(undefined)` check, logs a misleading "not terminal" warning and returns — predictions never scored, but no error surfaces.

## Goal

Detect the no-result shape at the single integration boundary (`fetchSportmonks`) and convert it into a typed, named error (`SportmonksNotFoundError`) so every caller can react deterministically.

---

## Confirmed Code Facts (verified against source)

- `server/src/lib/logger.ts:23` — `sportmonksLogger` is a pino child logger; supports `.warn(obj, msg)` and `.error(obj, msg)`.
- `server/src/lib/sportmonks.ts:136-138` — success path: `const response = await res.json(); console.log(...); return response as T;`. This is the **only** place a 200 body is parsed.
- `server/src/lib/sportmonks.ts:139-154` — outer `catch` re-throws any error (network/parse). A thrown `SportmonksNotFoundError` from inside the `try` would be caught here, logged generically, and re-thrown. **This must be handled** so the named error is not double-logged or reclassified.
- `server/src/lib/sportmonks.ts:181-188` — `fetchFixturesForDate`, uses `(data.data ?? [])`.
- `server/src/lib/sportmonks.ts:190-198` — `fetchFixtureWithEvents`, returns `data` directly.
- `server/src/workers/match-poller.ts:14-105` — `setInterval` callback wrapped in try/catch (lines 15-104). `interval` is in closure scope; `onComplete` is the callback param.
- `server/src/engines/scoring-engine.ts:13-22` — `runScoringEngine`, calls `fetchFixtureWithEvents` at line 17, no try/catch.
- `server/prisma/schema.prisma:19-25` — `enum JobStatus { PENDING RUNNING COMPLETED POSTPONED VOID }`. **No `FAILED` / `NOT_FOUND` value.** See state.md open question OQ-1.

---

## Phase 0: Define `SportmonksNotFoundError`

**Objective:** Introduce a dedicated error class so callers can branch on `instanceof` without string matching.

**Affected files:**
- `server/src/lib/sportmonks.ts` (add near top, after imports / before `BASE_URL` or right after it — i.e. top-level export, around line 4)

**Steps:**
1. Add an exported error class:
   - Class `SportmonksNotFoundError extends Error`.
   - Constructor accepts `(path: string, apiMessage: string, requestedEntity?: string)`.
   - Set `this.name = 'SportmonksNotFoundError'`.
   - Store `path`, `apiMessage`, `requestedEntity` as public readonly fields for structured logging by callers.
   - Compose a `message` like `Sportmonks ${path} → no result: ${apiMessage}`.
2. Restore the prototype chain for reliable `instanceof` across transpilation targets:
   - `Object.setPrototypeOf(this, SportmonksNotFoundError.prototype);` in the constructor.

**Expected behavior:** A new exported symbol available to import in workers/engines.

**Verification:**
- `import { SportmonksNotFoundError } from '../lib/sportmonks'` compiles.
- `new SportmonksNotFoundError('/x','msg') instanceof SportmonksNotFoundError === true` and `instanceof Error === true`.

**Rehydration context:** `server/src/lib/sportmonks.ts` is the sole Sportmonks integration module. It exports fetch helpers and type interfaces. The new class must be exported from this same file so workers (`server/src/workers/match-poller.ts`) and engines (`server/src/engines/scoring-engine.ts`) can import it. TypeScript target may be ES5/ES2015 transpiled — hence the explicit `setPrototypeOf` for `instanceof` reliability.

---

## Phase 1: Detect no-result shape in `fetchSportmonks`

**Objective:** Convert the 200 no-result payload into a `SportmonksNotFoundError` at the integration boundary so no caller ever receives the corrupted shape.

**Affected files:**
- `server/src/lib/sportmonks.ts:136-138` (success-path parse block) and `server/src/lib/sportmonks.ts:139-154` (outer catch)

**Steps:**
1. After `const response = await res.json();` (currently line 136), add a detection guard **before** `return response as T`:
   - Detect the no-result shape: `response` is a non-null object AND `typeof response.message === 'string'` AND `Array.isArray(response.subscription)` AND `!('data' in response)`.
   - Rationale for the exact predicate: a genuine successful payload always carries a `data` key (object or array). The no-result envelope carries `message` + `subscription` + `rate_limit` + `timezone` but never `data`. Requiring all three (`message` string, `subscription` array, absence of `data`) avoids false positives on real responses that happen to include a `message`.
2. When the guard matches:
   - Extract `requestedEntity` from `response.rate_limit?.requested_entity` (optional, for logging).
   - Log at **warn** level via `sportmonksLogger.warn({ path, apiMessage: response.message, requestedEntity, rateLimit: response.rate_limit }, 'Sportmonks returned 200 with no result')`. (Decision #6: log the raw message for observability; treat "no data" and "no subscription" identically — both produce this same shape, so no branching needed.)
   - `throw new SportmonksNotFoundError(path, response.message, requestedEntity)`.
3. **Remove the stray `console.log(JSON.stringify(response, null, 2));` at line 137** (debug noise; replace with the structured logger already used). Also remove `console.log(token);` at line 87 (leaks the API token to stdout — security). See invariants.md INV-5.
4. Update the **outer catch** (lines 139-154) so it does **not** reclassify the named error:
   - At the top of the catch block, add: if `err instanceof SportmonksNotFoundError`, re-throw it immediately without the generic `sportmonksLogger.error(... 'request failed (network or parsing error)')`. The warn log from step 2 already captured it; the generic error log would be misleading and double-count.

**Expected behavior:**
- Real responses (`{ data: ... }`) pass through unchanged.
- No-result responses throw `SportmonksNotFoundError` with `path`, `apiMessage`, `requestedEntity` populated, logged once at warn level.

**Verification:**
- Feed a mock no-result payload → `fetchSportmonks` rejects with `SportmonksNotFoundError`.
- Feed `{ data: [...] }` → resolves normally.
- Confirm only one log line (warn) is emitted for the no-result case (no trailing generic error log).
- Confirm no `console.log` of token or full payload remains.

**Rehydration context:** `fetchSportmonks<T>(path)` (`server/src/lib/sportmonks.ts:81-155`) is a generic GET wrapper. It already throws a plain `Error` for `!res.ok`. The success branch parses JSON at line 136. The function body is wrapped in a try/catch (lines 88-154) whose catch re-throws; therefore a throw inside the try is intercepted there and must be passed through untouched when it is a `SportmonksNotFoundError`.

---

## Phase 2: Handle in `fetchFixturesForDate` (return empty, warn)

**Objective:** A date with no fixtures (or no subscription) should yield an empty list, not crash callers — but it must be observable.

**Affected files:**
- `server/src/lib/sportmonks.ts:181-188`

**Steps:**
1. Wrap the `await fetchSportmonks<{ data: SportmonksFixture[] }>(path)` call in a try/catch.
2. In catch: if `err instanceof SportmonksNotFoundError`, log at warn — `sportmonksLogger.warn({ dateStr, path, apiMessage: err.apiMessage }, 'No fixtures returned for date (Sportmonks no-result)')` — and `return []`.
3. Re-throw any other error (preserve existing failure semantics for genuine HTTP/network errors).
4. The `(data.data ?? [])` fallback at line 187 can remain as defense-in-depth but is now redundant for the no-result case (that path now throws before reaching here).

**Expected behavior:** `fetchFixturesForDate` resolves to `[]` on no-result; still rejects on real errors.

**Verification:**
- Mock `fetchSportmonks` to throw `SportmonksNotFoundError` → `fetchFixturesForDate` resolves to `[]` and emits one warn log including `dateStr`.
- Mock a generic `Error` → `fetchFixturesForDate` rejects with that error.

**Rehydration context:** `fetchFixturesForDate(dateStr)` builds a path filtered by `SPORTMONKS_LEAGUE_ID` and maps results through `mapFixture`. Callers (sync/ticker jobs) expect `MappedFixture[]`. Returning `[]` is the correct empty-set semantic.

---

## Phase 3: Let `SportmonksNotFoundError` propagate from `fetchFixtureWithEvents`

**Objective:** Per Decision #3, do not swallow the error here; callers (poller, scoring engine) own the reaction.

**Affected files:**
- `server/src/lib/sportmonks.ts:190-198`

**Steps:**
1. **No change to the body** — `fetchFixtureWithEvents` simply awaits `fetchSportmonks` and returns. Since Phase 1 makes `fetchSportmonks` throw, the error already propagates naturally.
2. (Optional doc) Add a JSDoc note above the function: "Throws `SportmonksNotFoundError` when the fixture is not found / not in subscription; callers must handle."

**Expected behavior:** `fetchFixtureWithEvents` rejects with `SportmonksNotFoundError` for no-result; returns `SportmonksFixture` otherwise.

**Verification:** Mock `fetchSportmonks` to throw → `fetchFixtureWithEvents` rejects with the same error instance (no wrapping).

**Rehydration context:** `fetchFixtureWithEvents(fixtureId)` returns a single `SportmonksFixture`. It is called by the match poller every 30s and once by the scoring engine.

---

## Phase 4: Handle in `match-poller.ts` — stop polling on not-found

**Objective:** Per Decision #4, a not-found fixture is unrecoverable for this poll lifecycle: clear the interval, log error, complete. Do not keep hammering the API every 30s on a fixture the subscription can't see.

**Affected files:**
- `server/src/workers/match-poller.ts:1-2` (imports), `:102-104` (catch block)

**Steps:**
1. Add `SportmonksNotFoundError` to the existing import from `'../lib/sportmonks'` (line 2).
2. In the catch block (lines 102-104), branch:
   - If `err instanceof SportmonksNotFoundError`:
     - `clearInterval(interval);`
     - `log.error({ err, fixtureId, apiMessage: err.apiMessage }, 'Fixture not found / not in subscription — stopping poller');`
     - Set JobQueue status — **see OQ-1 in state.md**. Recommended: `await prisma.jobQueue.update({ where: { fixtureId }, data: { status: 'VOID' } });` wrapped in its own try/catch so a DB failure does not prevent `onComplete()`. (Rationale: `VOID` is the only terminal non-success enum value available; leaving the job `PENDING`/`RUNNING` would orphan it and risk re-enqueue.)
     - `onComplete();`
     - `return;`
   - Else: keep existing behavior — `log.error({ err }, 'Poll cycle error');` and continue polling (transient errors should retry).

**Expected behavior:** On not-found, the interval is cleared exactly once, an error is logged, the job is marked terminal, `onComplete` fires, and no further polls occur.

**Verification:**
- Mock `fetchFixtureWithEvents` to throw `SportmonksNotFoundError` → assert `clearInterval` called, `onComplete` called once, no further poll iterations.
- Mock a generic error → assert poller continues (interval not cleared, `onComplete` not called).

**Rehydration context:** `startMatchPoller(fixtureId, onComplete)` (`server/src/workers/match-poller.ts:10-106`) runs a `setInterval` every `POLL_INTERVAL_MS` (30s). The closure holds `interval` and `onComplete`. Terminal/postponed/void/suspended branches each `clearInterval` + `onComplete` + `return`. The not-found path mirrors this control-flow contract. `prisma` is already imported at line 1.

---

## Phase 5: Handle in `scoring-engine.ts` — abort scoring on not-found

**Objective:** Per Decision #5, if the fixture cannot be fetched, scoring is impossible — log error and return early. Do not throw an unhandled rejection that would crash the worker or be caught as a generic poll error.

**Affected files:**
- `server/src/engines/scoring-engine.ts:3` (imports), `:17` (fetch call)

**Steps:**
1. Add `SportmonksNotFoundError` to the existing import from `'../lib/sportmonks'` (line 3).
2. Wrap the `const rawFixture = await fetchFixtureWithEvents(fixtureId);` (line 17) in a try/catch:
   - In catch: if `err instanceof SportmonksNotFoundError`, `log.error({ err, fixtureId, apiMessage: err.apiMessage }, 'Cannot score — fixture not found / not in subscription');` then `return;`.
   - Else re-throw (preserve existing failure behavior for genuine errors so the poller's catch logs it).
3. Keep `rawFixture` in scope after the try/catch — restructure so `rawFixture` is assigned within try and used afterward (e.g. declare `let rawFixture: SportmonksFixture` before the try, assign inside, return-early in catch).

**Expected behavior:** On not-found, scoring returns early with an error log; no prediction batch runs; no `undefined.state_id` access.

**Verification:**
- Mock `fetchFixtureWithEvents` to throw `SportmonksNotFoundError` → `runScoringEngine` resolves (does not throw), emits one error log, performs zero prisma writes.
- Mock a generic error → `runScoringEngine` rejects (re-throws).
- Mock a valid terminal fixture → existing scoring flow unchanged.

**Rehydration context:** `runScoringEngine(fixtureId)` (`server/src/engines/scoring-engine.ts:13-104`) fetches the fixture, verifies terminal state, parses scores, then batch-scores predictions in transactions. It is invoked from the poller (`match-poller.ts:22`) on terminal state. `scoringLogger` is the child logger (`log`).

---

## Phase 6: Tests (regression guard)

**Objective:** Lock the new contract so future refactors cannot reintroduce silent corruption.

**Affected files (new test files, location per existing test convention — verify with a glob for `*.test.ts` / `*.spec.ts` under `server/`):**
- A unit test for `fetchSportmonks` no-result detection (mock `fetch`).
- A unit test for `fetchFixturesForDate` returning `[]`.
- A unit test for `match-poller` stopping on not-found.
- A unit test for `scoring-engine` aborting on not-found.

**Steps:**
1. Locate the test runner/config (jest/vitest) and mocking approach used in `server/`.
2. Author the four cases above, asserting the verification criteria from Phases 1, 2, 4, 5.

**Expected behavior:** All four tests pass; existing tests unaffected.

**Verification:** Run the suite; new tests green, no regressions.

**Rehydration context:** This phase has no production-code changes. It depends on Phases 0-5 being complete. If no test harness exists in `server/`, this phase escalates to the human (do not scaffold a framework unilaterally).
