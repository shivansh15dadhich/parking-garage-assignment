# Parking Garage Management System

## Overview

A full-stack management system for a busy multi-level city-centre parking garage. An
authenticated attendant can check vehicles in and out, have spots assigned automatically
based on vehicle type, calculate parking fees under a tiered pricing model, search for
vehicles by license plate, and review a paginated, sortable history of all activity.

## Features

- Attendant registration and login (JWT-based auth)
- Automatic, rule-based parking spot assignment (EV vehicles only get EV spots)
- Tiered, **per-spot-type** hourly pricing with a daily maximum cap, part-hours rounded up
- Rate cards can be imported from messy/dirty source data (currency symbols, mixed case,
  duplicate rows) and are cleaned before being applied
- A virtual clock lets time be fast-forwarded to trigger the nightly job that auto-closes
  and bills any session parked over 24h, freeing its spot
- Valet hand-off: an open session can be transferred to a different license plate, with
  the spot and original entry time carried over unchanged
- License plate search across all vehicles (current and historical)
- Live dashboard: total/occupied/available spots, EV availability, active vehicles, today's revenue
- Full parking history with pagination and sorting
- Hard backend + database-level prevention of double-parking and duplicate check-ins
- Landing page describing the product

## Tech Stack

**Frontend:** React, Vite, React Router, plain CSS
**Backend:** Node.js, Express
**Database:** SQLite via `better-sqlite3` (synchronous driver — no async/await boilerplate around every query, and the whole DB lives in one portable file)
**Auth:** JWT (`jsonwebtoken`) + password hashing (`bcryptjs`)

## Project Structure

```
server/
  src/
    controllers/   route handler logic (thin — delegates to services)
    routes/         Express route definitions
    services/       business logic: feeCalculator, spotAssignment, rates,
                    rateCardImporter, autoClose
    middleware/     auth (JWT verify), errorHandler
    db/             schema.sql, db connection, seed script, importRates script
    data/           rateCard.raw.csv — sample messy rate card
    utils/          input validators, clock (virtual time for the nightly job)
    config.js       default rates, JWT config, compatibility rules
    app.js          Express app entry point
client/
  src/
    pages/          one component per route (incl. Rates, ClockAdmin)
    components/     shared UI: Navbar, SummaryCard, Pagination
    context/        AuthContext (login/register/logout state)
    services/       api.js — fetch wrapper with JWT header injection
    utils/          feeEstimate.js — client-side display-only fee preview
```

## Prerequisites

- Node.js 18+
- npm

## Installation

```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

## Environment Variables

Copy `server/.env.example` to `server/.env`:

```
PORT=4000
JWT_SECRET=replace-with-a-long-random-string
DB_PATH=./parking.db
```

Never commit a real `.env` file — only `.env.example` is checked in.

## Database Setup

The schema is applied automatically on server startup (`server/src/db/schema.sql` is run
against the SQLite file at `DB_PATH`). No separate migration step is needed.

## Seed Data

```bash
cd server
npm run seed
```

This creates 8 parking spots across 2 floors and one demo attendant account:

| Spot | Floor | Type |
|---|---|---|
| C-101, C-102 | 1 | COMPACT |
| S-103, S-104 | 1 | STANDARD |
| EV-105 | 1 | EV |
| C-201 | 2 | COMPACT |
| S-202 | 2 | STANDARD |
| EV-203 | 2 | EV |

Seeding also imports the sample messy rate card at `server/src/data/rateCard.raw.csv` into
the `rate_cards` table (see [Rate Card Import](#rate-card-import) below). To (re-)import a
rate card on its own, without touching spots/users:

```bash
cd server
npm run import-rates
```

**Demo login:** `attendant@garage.com` / `password123`

## Running the Application

```bash
# Terminal 1 — backend (http://localhost:4000)
cd server
npm start

# Terminal 2 — frontend (http://localhost:5173)
cd client
npm run dev
```

The Vite dev server proxies `/api/*` requests to `http://localhost:4000`, so the frontend
never needs a hardcoded backend URL or CORS configuration in development.

## API Documentation

All endpoints return JSON. Protected endpoints require a header:
`Authorization: Bearer <token>`

### Auth

**POST /api/auth/register**
Auth required: No
Body: `{ "name": "string", "email": "string", "password": "string (min 6 chars)" }`
Response `201`:
```json
{ "token": "...", "user": { "id": 1, "name": "Demo", "email": "demo@x.com" } }
```

**POST /api/auth/login**
Auth required: No
Body: `{ "email": "string", "password": "string" }`
Response `200`: same shape as register.

**GET /api/auth/me**
Auth required: Yes
Response `200`: `{ "user": { "id": 1, "name": "...", "email": "...", "created_at": "..." } }`

### Dashboard

**GET /api/dashboard**
Auth required: Yes
Response `200`:
```json
{
  "totalSpots": 8, "occupiedSpots": 2, "availableSpots": 6,
  "evSpots": { "total": 2, "available": 1 },
  "activeVehicles": 2, "todayRevenue": 130
}
```

### Parking

**POST /api/parking/check-in**
Auth required: Yes
Body: `{ "licensePlate": "string", "vehicleType": "COMPACT|STANDARD|EV" }`
Response `201`:
```json
{
  "message": "Vehicle checked in successfully",
  "session": {
    "id": 1, "check_in_time": "...", "license_plate": "RJ14AB1234",
    "vehicle_type": "STANDARD", "spot_number": "S-103", "floor": 1
  }
}
```
Errors: `400` invalid input, `409` vehicle already checked in / no suitable spot available.

**POST /api/parking/check-out**
Auth required: Yes
Body: `{ "licensePlate": "string" }`
Response `200`:
```json
{
  "message": "Vehicle checked out successfully",
  "receipt": {
    "id": 1, "check_in_time": "...", "check_out_time": "...",
    "duration_minutes": 95, "amount": 80, "license_plate": "RJ14AB1234",
    "vehicle_type": "STANDARD", "spot_number": "S-103", "floor": 1
  }
}
```
Errors: `404` vehicle not found, `409` vehicle not currently parked.

**POST /api/parking/transfer** (valet hand-off)
Auth required: Yes
Body: `{ "fromLicensePlate": "string", "toLicensePlate": "string", "toVehicleType": "COMPACT|STANDARD|EV" }`
`toVehicleType` is only required when `toLicensePlate` is a plate not seen before; an
already-known plate uses its own registered type.
Response `200`:
```json
{
  "message": "Session transferred from RJ14AB1234 to RJ14XY9999",
  "session": {
    "id": 5, "check_in_time": "...", "license_plate": "RJ14XY9999",
    "vehicle_type": "STANDARD", "spot_number": "S-104", "floor": 1
  }
}
```
The session keeps its original `id`, `parking_spot_id`, and `check_in_time` — only the
vehicle it's billed against changes. Errors: `400` invalid input / same plate on both
sides / new vehicle type incompatible with the spot, `404` `fromLicensePlate` has no open
session, `409` `toLicensePlate` already has its own open session elsewhere.

**GET /api/parking/active**
Auth required: Yes
Response `200`: `{ "vehicles": [ { ...active session rows... } ] }`

**GET /api/parking/history?page=1&limit=10&sortBy=check_in_time&order=desc**
Auth required: Yes
Query params:
- `page` (default 1)
- `limit` (default 10, max 100)
- `sortBy`: one of `check_in_time`, `check_out_time`, `amount`, `license_plate`
- `order`: `asc` or `desc` (default `desc`)

Response `200`:
```json
{
  "records": [ { ... } ],
  "pagination": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 }
}
```
Errors: `400` invalid `sortBy` or `order`.

**GET /api/parking/search?licensePlate=RJ14AB1234**
Auth required: Yes
Response `200`:
```json
{
  "vehicle": { "licensePlate": "RJ14AB1234", "vehicleType": "STANDARD" },
  "status": "PARKED",
  "currentSpot": "S-103", "floor": 1, "checkInTime": "..."
}
```
Errors: `400` missing query param, `404` no matching vehicle.

### Spots

**GET /api/spots** — Auth required: Yes — all spots with occupancy status
**GET /api/spots/available** — Auth required: Yes — only unoccupied spots
**GET /api/spots/available/ev** — Auth required: Yes — `{ "available": 1, "spots": [...] }`

### Vehicles

**GET /api/vehicles/:licensePlate**
Auth required: Yes
Response `200`: `{ "vehicle": {...}, "sessions": [ ...all past & current sessions... ] }`
Errors: `404` vehicle not found.

### Rates

**GET /api/rates**
Auth required: Yes
Response `200`: `{ "rates": { "COMPACT": {"firstHourRate":50,"additionalHourRate":30,"dailyMax":250}, "STANDARD": {...}, "EV": {...} } }`

**POST /api/rates/import**
Auth required: Yes
Body: `{ "csv": "<raw, possibly messy rate card text>" }`
Response `200`:
```json
{
  "message": "Rate card imported",
  "imported": ["COMPACT", "STANDARD", "EV"],
  "skipped": [{ "line": 4, "reason": "unrecognized spot type \"unknown\"", "raw": "unknown,10,10,10" }],
  "rates": { "COMPACT": {...}, "STANDARD": {...}, "EV": {...} }
}
```
Errors: `400` empty body or no valid rows found (`skipped` explains why).

### Clock (testing/ops utility — see [Virtual Clock](#virtual-clock--nightly-auto-close))

**GET /api/clock** — Auth required: No — `{ "now": "...", "isVirtual": false }`

**POST /api/clock**
Auth required: No
Body: one of `{ "now": "ISO string" }`, `{ "advanceHours": number }`, `{ "reset": true }`
Response `200`: `{ "message": "...", "time": "...", "autoClosed": [ { "sessionId": 5, "licensePlate": "...", "durationMinutes": 1800, "amount": 280 } ] }`
Errors: `400` none of the above fields provided, or an invalid value.

## Parking Fee Rules

- First hour (or any part of it): a spot-type-specific rate
- Every additional started hour: a spot-type-specific (lower) rate
- Daily maximum: a spot-type-specific cap (fee never exceeds this regardless of duration)
- Part-hours always round **up** — a single minute into a new hour is charged as a full hour

Rates are **per spot type**, not global, and live in the `rate_cards` table (seeded from
`server/src/data/rateCard.raw.csv`, see [Rate Card Import](#rate-card-import)). A spot type
with no row yet falls back to `config.defaultRates`. The calculation itself stays a single
pure function, `calculateFee(durationMinutes, rates)` in
`server/src/services/feeCalculator.js` — it no longer reads config directly, so it's
trivially testable against any rate card. Default rates:

| Spot Type | First Hour | Extra Hour | Daily Cap |
|---|---|---|---|
| COMPACT | ₹50 | ₹30 | ₹250 |
| STANDARD | ₹60 | ₹35 | ₹280 |
| EV | ₹80 | ₹45 | ₹350 |

## Rate Card Import

A garage's real rate card rarely arrives clean — see `server/src/data/rateCard.raw.csv`
for a representative example: currency symbols (`$`, `₹`), inconsistent whitespace, mixed
case, spot-type synonyms (`std`, `Electric`), a blank line, an unrecognized spot type, and
a corrected duplicate row (a bad `999` price followed later by the real one for the same
spot type).

`server/src/services/rateCardImporter.js` is a pure `parseRateCard(rawCsv)` function that:
- Skips blank lines and the header row
- Normalizes spot-type names (trim, upper-case, alias lookup — e.g. `STD` → `STANDARD`,
  `ELECTRIC` → `EV`); an unrecognized type is skipped, never guessed at
- Strips currency symbols/whitespace from numbers before parsing them; a missing,
  negative, or non-numeric value is skipped
- When the same spot type appears more than once, the **last valid row wins** — later
  rows in a rate card are treated as corrections of earlier ones

`server/src/db/importRates.js` applies the cleaned rates to the `rate_cards` table
(via `INSERT ... ON CONFLICT DO UPDATE`) and is used both by `npm run import-rates` (reads
`data/rateCard.raw.csv`) and by `POST /api/rates/import` (accepts raw CSV text in the
request body), so a fresh, messier rate card can be dropped in at any time without a
server restart.

## Virtual Clock & Nightly Auto-Close

Without something forcing them closed, a session nobody ever checks out would occupy its
spot forever. `server/src/services/autoClose.js` runs a "nightly job": it finds every
`ACTIVE` session parked more than 24h as of the current time, bills it at its spot type's
rate for the actual elapsed duration, marks it `COMPLETED`, and frees its spot.

Rather than requiring a real 24-hour wait to exercise this, `server/src/utils/clock.js` is
a process-wide virtual clock: business logic that needs "now" (check-in, check-out, the
auto-close job, the dashboard's "today" boundary) reads it from here instead of calling
`new Date()` directly. `POST /api/clock` sets this virtual time — via an absolute `now`,
a relative `advanceHours`, or `reset: true` to return to real time — and immediately runs
the auto-close job against it, returning exactly which sessions it closed and billed.
This endpoint is intentionally left unauthenticated, as a testing/ops hook rather than an
attendant-facing feature; it must not be exposed like this in a real production deployment.
The clock is in-memory only and resets to real time on every server restart.

## Valet Hand-off (Session Transfer)

`POST /api/parking/transfer` moves an `ACTIVE` session onto a different license plate —
for example, a valet who checked a car in under a temporary plate and later needs to
correct it, or a spot hand-off between vehicles. The session's `id`, `parking_spot_id`,
and `check_in_time` are left untouched; only its `vehicle_id` changes, so billing
continues from the original entry time rather than restarting. The destination vehicle
(new or existing) must be compatible with the spot's type under the same
`spotCompatibility` rules used at check-in, and cannot already have its own open session
elsewhere.

## Parking Assignment Rules

- COMPACT vehicles → COMPACT spots only
- STANDARD vehicles → STANDARD spots only
- EV vehicles → EV spots only (never falls back to another spot type)
- An occupied spot is never reassigned
- When multiple compatible spots are free, the lowest floor and lowest spot number is chosen (deterministic, easy to test and explain)

Rules live in `server/src/config.js` (`spotCompatibility`) and the selection logic in
`server/src/services/spotAssignment.js`.

## Search

Search matches by license plate (partial match, case-insensitive after normalization) and
returns the vehicle's current parking status pulled live from the database — not from
frontend-cached data.

## Pagination

Implemented at the SQL level (`LIMIT`/`OFFSET`) in `GET /api/parking/history`, so only the
requested page of rows is ever fetched from the database. The frontend shows the current
page, total record count, and next/previous controls.

## Sorting

`GET /api/parking/history` accepts a `sortBy` field restricted to a whitelist
(`check_in_time`, `check_out_time`, `amount`, `license_plate`) and an `order` of `asc` or
`desc`, applied directly in the SQL `ORDER BY` clause.

## Testing

Manual end-to-end testing was performed against the running API with `curl`, covering:
register/login, JWT rejection on missing/invalid token, check-in (compact/standard/EV),
duplicate check-in rejection, EV-spot-exhaustion rejection, active vehicle listing,
search, checkout (including fee calculation and spot release), checkout of an unparked
vehicle (rejected), paginated + sorted history, and rejection of an invalid `sortBy`
value. All of the above passed. The fee calculator and spot assignment functions were
also independently exercised against every example given in the assessment brief (30min
→ ₹50, 1h20m → ₹80, 2h10m → ₹110, 10h → capped at ₹250) and matched exactly.

The full frontend+backend stack was also started together and verified end-to-end: the
Vite dev server serves the app and correctly proxies `/api/*` calls to the backend
(confirmed via a live login request through the proxy).

No automated test suite (e.g. Jest) was added given the 2.5-hour time limit — see
REASONING.md for the trade-off discussion.

The three follow-up twists (messy rate card import, virtual-clock-driven nightly
auto-close, valet hand-off transfer) were verified end-to-end with `curl` against the
running API: importing the sample messy CSV correctly cleaned 3 spot types and skipped 2
junk rows; checking in vehicles and transferring an open session onto a new plate
preserved its spot and original `check_in_time`; a type-incompatible transfer target was
rejected; advancing the virtual clock 30h via `POST /api/clock` auto-closed every active
session at its spot type's capped rate and freed all their spots; and the dashboard's
"today's revenue" correctly reflected the virtual (not wall-clock) date.

## Known Limitations

- No automated test suite; testing was manual/scripted via curl.
- The frontend's "estimated fee" shown for a still-active vehicle is a client-side
  approximation for display purposes only — the authoritative fee is always calculated
  by the backend at the moment of checkout.
- No password reset / email verification flow.
- Single attendant role — no admin vs. attendant permission levels.
- Vehicle type is fixed once a license plate is first registered (re-checking in the
  same plate with a different type is rejected rather than updating it).
- The virtual clock (`server/src/utils/clock.js`) is in-memory and per-process — it
  resets to real time on every server restart and isn't shared across multiple server
  instances. Fine for a single-process dev/test/grading setup, not for production.
- `POST /api/clock` is unauthenticated by design (a testing/ops hook); it must be removed
  or locked down before any real deployment.
- Transferring a session does not keep a separate audit trail of prior plates — the
  session's history simply shows whichever plate it's currently billed against.

## Future Improvements

1. Reserved / pre-booked spots for regular customers
2. Automated email or SMS receipts on checkout
3. Analytics dashboard showing occupancy trends over time
