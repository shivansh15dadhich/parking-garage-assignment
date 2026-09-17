# REASONING.md

## 1. Problem Understanding

The core of this problem is a check-in/check-out state machine over a fixed pool of
parking spots, with two hard invariants that must never be violated: (a) a spot can only
be occupied by one active vehicle at a time, and (b) a vehicle can only have one active
session at a time. Everything else — fee calculation, EV compatibility, search,
pagination — sits on top of that state machine.

## 2. Main Assumptions

- "Vehicle type" is fixed per license plate once first seen. Re-checking in an existing
  plate with a different declared type is rejected rather than silently updated, to avoid
  a vehicle quietly changing class (and therefore spot eligibility) between visits.
- A vehicle checking in and out within the same minute still owes at least the first-hour
  rate — occupying a spot for any duration counts as a minimum 1-hour charge, matching
  the pricing table in the brief (e.g. 30 minutes → ₹50, not ₹0).
- "Is an EV spot free right now?" is answered by a dedicated `GET /api/spots/available/ev`
  endpoint plus a dashboard indicator, rather than requiring the attendant to filter the
  full spot list manually.
- Search is scoped to license plate only, as explicitly stated in the brief.

## 3. Architecture Choice

Kept to the recommended stack (React/Vite frontend, Express backend, SQLite) with no
deviation — it's a well-understood, fast-to-scaffold combination well suited to a 2.5-hour
window. The one specific choice worth calling out: **`better-sqlite3`** instead of the
async `sqlite3` package. It's a synchronous driver, so every query is a plain function
call with no promise-wrapping or callback boilerplate — this measurably reduced the amount
of code needed in every controller and made the two `db.transaction(...)` blocks (used for
check-in and check-out, where two writes must succeed or fail together) trivial to write
correctly.

Business logic (fee calculation, spot assignment) is deliberately kept out of route
handlers and in `server/src/services/` as pure functions. This made both testable in
isolation with plain Node scripts before any HTTP layer existed, which caught the pricing
edge cases early (see Testing below).

## 4. Database Design Reasoning

Four tables as specified: `users`, `parking_spots`, `vehicles`, `parking_sessions`.
`vehicles` and `parking_sessions` are separate (rather than folding vehicle info into the
session) so that a vehicle's full history persists across multiple visits and its type is
recorded once, not duplicated per session.

One addition beyond the minimum schema: **two partial unique indexes**,

```sql
CREATE UNIQUE INDEX idx_unique_active_vehicle ON parking_sessions(vehicle_id) WHERE status = 'ACTIVE';
CREATE UNIQUE INDEX idx_unique_active_spot ON parking_sessions(parking_spot_id) WHERE status = 'ACTIVE';
```

These make double-parking and duplicate check-in structurally impossible at the database
layer, not just something the application code happens to check first. The application
still checks these conditions explicitly before inserting (so it can return a clean 409
with a helpful message), but the index is the real backstop if two requests ever race.

## 5. Parking Spot Assignment Logic

`assignSpot(vehicleType, availableSpots)` in `spotAssignment.js` filters the list of
currently-unoccupied spots down to ones compatible with the vehicle's type (via a
lookup table in `config.js`, so the compatibility rules live in exactly one place), then
picks the lowest floor and, within a floor, the lowest spot number. This ordering is
arbitrary but deterministic — chosen so behavior is predictable and easy to explain/test,
rather than e.g. random selection which would be harder to reason about in an interview.

EV vehicles are only ever matched against EV spots — there is no fallback to another spot
type, per the brief's explicit requirement.

## 6. Fee Calculation Logic

`calculateFee(durationMinutes)` in `feeCalculator.js`: duration is converted to whole
hours by always rounding up (`Math.ceil`), a minimum of 1 hour is enforced, the first
hour is charged at `firstHourRate`, each additional hour at `additionalHourRate`, and the
total is capped at `dailyMax`. All three numbers live in one place (`config.js`) so
pricing can be changed without touching logic.

## 7. Authentication Approach

Standard JWT bearer tokens (8-hour expiry) with `bcryptjs` for password hashing (cost
factor 10). Chose plain JWT with no refresh-token flow — the added complexity isn't
justified for an attendant tool used in continuous shifts within a single browser
session, and it's out of scope for a 2.5-hour build.

## 8. Search Implementation

Search runs a `LIKE` query against the `vehicles` table directly in the database (not
against frontend-cached data), then joins against `parking_sessions` to determine current
status. This satisfies the requirement that search work against real data, not a
client-side filter of already-fetched records.

## 9. Pagination and Sorting

Both implemented at the SQL level: pagination via `LIMIT`/`OFFSET` computed from `page`
and `limit` query params, sorting via a whitelist map from public field name to actual SQL
column (`check_in_time`, `check_out_time`, `amount`, `license_plate`), with the direction
validated against `asc`/`desc` before being interpolated into the query. The whitelist
step matters: it avoids ever putting unsanitized query-string content directly into SQL
syntax while still letting the client pick a sort column.

## 10. Double-Parking Prevention

Covered in depth in section 4 (Database Design). In short: application-level check before
insert (for a clean error message) plus a database-level partial unique index (as the
actual guarantee).

## 11. EV Handling

EV compatibility is enforced in one place (`spotCompatibility.EV = ['EV']` in
`config.js`) and consumed identically by spot assignment. The dashboard surfaces
`evSpots: { total, available }` directly, and a dedicated endpoint
(`GET /api/spots/available/ev`) exists so the frontend (or any other client) can answer
"is an EV spot free right now?" without fetching and filtering the entire spot list.

## 12. Testing Performed

- **Pure function tests** (before any HTTP layer): ran `feeCalculator.calculateFee` and
  `spotAssignment.assignSpot` directly via a Node script against every example in the
  brief. All matched exactly (30min→₹50, 80min→₹80, 130min→₹110, 600min→₹250 capped).
- **Full API smoke test** via `curl` against a running server with a freshly seeded
  database: login, dashboard read, check-in (STANDARD then EV), duplicate check-in
  (confirmed 409), filling both EV spots and confirming a third EV check-in is rejected
  with no fallback spot assigned, active-vehicle listing, search, checkout (confirmed fee
  and spot release), checkout of an already-checked-out vehicle (confirmed 409), history
  with pagination + sorting, an invalid `sortBy` value (confirmed 400), and an
  unauthenticated dashboard request (confirmed 401). All passed on first run.
- **Frontend build**: `npm run build` completed with no errors.
- **Integration check**: started backend and frontend dev servers together and confirmed
  the Vite proxy correctly forwards `/api/*` to the backend (a login request through
  `localhost:5173/api/auth/login` returned a valid token).
- Did not run a full manual click-through of every UI screen with a browser inside this
  environment (no interactive browser available in the AI tooling used to build this) —
  the UI code is a direct, straightforward consumer of the API endpoints above, all of
  which were confirmed working, but this is worth a manual pass before final submission.

## 13. Bugs/Issues Encountered

- None in the core logic — the fee calculator and spot assignment functions passed
  against the spec's examples on the first attempt.
- One environment-only issue while building this (not an application bug): background
  server processes did not persist between separate shell tool invocations in the
  development sandbox, which required restructuring test scripts to start the server and
  run all checks within a single shell session. This has no bearing on how the
  application runs normally with `npm start` / `npm run dev`.

## 14. How Issues Were Fixed

See above — resolved by writing a single combined shell script that starts the server(s)
and immediately runs the relevant `curl` checks in one session, rather than relying on a
detached background process surviving across separate tool calls.

## 15. Trade-offs Made Because of the 2.5-Hour Time Limit

- No automated test framework (Jest/Vitest) — relied on direct script execution of the
  pure business-logic functions plus `curl`-driven API testing instead. The logic that
  matters most (fee calculation, spot assignment) is isolated in pure functions
  specifically so it *could* be unit tested quickly if time allowed.
- No manual click-through testing of the deployed UI in a real browser was performed as
  part of this build (see Testing section) — the API surface it depends on is fully
  verified, but the UI itself should get a quick manual pass before submission.
- No refresh-token flow, no password reset, no role-based permissions (attendant vs
  admin) — all reasonable v2 features but unnecessary for demonstrating the core garage
  workflow.
- Client-side "estimated fee" on the Active Vehicles page duplicates the pricing constants
  from the backend for display purposes only. This is a deliberate, documented duplication
  (see README's Known Limitations) rather than adding a new backend endpoint purely for a
  live-updating preview — the authoritative fee is always recalculated server-side at
  checkout.

## 16. What I Would Improve With More Time

- Add a small Jest/Vitest suite covering the fee calculator's boundary values and the
  spot assignment function's tie-breaking behavior.
- Do a full manual browser walkthrough of every screen and edge case (empty states,
  slow-network handling, form validation messages).
- Add a `GET /api/parking/estimate?licensePlate=...` endpoint so the frontend's "fee so
  far" preview reads from the same source of truth as checkout, instead of duplicating
  the pricing constants client-side.
- Add role-based access (admin vs attendant) and a refresh-token flow for longer shifts.

## 17. Level 1/2/3 Twists — Design Decisions

**T4 — Messy rate card (per spot type).** Pricing moved from a single flat `config.pricing`
object to a `rate_cards` table keyed by spot type, with `config.defaultRates` as a fallback
for any type that hasn't had a card imported yet. `rateCardImporter.js` is kept as a pure
function (raw CSV string in, `{rates, skipped}` out) precisely so its cleaning rules —
alias mapping, currency stripping, last-valid-row-wins on duplicates — can be reasoned
about and tested without touching the DB. "Last valid row wins" was chosen over "first
row wins" or "reject the whole card on any duplicate" because a real rate card revision is
far more likely to be a list of corrections appended over time than a set of alternatives
to choose between — the sample `data/rateCard.raw.csv` includes exactly this shape (a bad
`999` row followed later by the real value for the same spot type).

**T2 — Nightly auto-close, graded via POST /clock.** Rather than mocking `Date` in tests or
waiting a real 24h, `utils/clock.js` introduces a single process-wide virtual clock that
every time-sensitive code path (check-in, check-out, the auto-close job, and the
dashboard's "today" boundary) reads through instead of calling `new Date()` directly.
`POST /api/clock` sets this clock and *immediately* runs the auto-close job in the same
request, returning exactly which sessions it closed — so a single HTTP call is enough to
both simulate the passage of time and observe the job's effect, which is what "graded via
POST /clock" implies. The clock is deliberately in-memory (not persisted to the DB): it's
a test/ops hook, not real application state, and should reset on every restart. For the
same reason, `/api/clock` is left unauthenticated — it's not an attendant-facing feature,
and gating it behind login would only complicate grading it. This is called out explicitly
in Known Limitations as something to strip out before any real deployment. The 24h
threshold closes on *elapsed time*, not on a calendar-day boundary, matching "any session
parked over 24h" literally rather than "any session that spans midnight."

**T6 — Valet hand-off transfer.** The simplest correct model was to leave the session row
almost entirely alone and only repoint its `vehicle_id`: `id`, `parking_spot_id`, and
`check_in_time` are untouched, so the fee at eventual checkout is computed from the
original entry time regardless of how many times the plate on file changed in between —
"entry time carries over" falls out of the data model for free rather than needing special
handling in `feeCalculator`. The destination plate/type is checked against the same
`spotCompatibility` map used at check-in (not a hardcoded equality check) so the rule
stays correct if compatibility ever becomes many-to-many. A destination plate already
mid-session elsewhere is rejected rather than silently ending its other session, since
that decision belongs to the attendant, not to the transfer endpoint.
