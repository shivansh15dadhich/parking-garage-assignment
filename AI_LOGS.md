You are my coding assistant for a strict 2.5-hour full-stack Builder Round.

AI tools are explicitly allowed in this assessment.

I need you to build a complete, working full-stack Parking Garage Management System based on the exact problem statement and twists below.

IMPORTANT:
- This is a timed 2.5-hour assessment.
- Prioritize a working, testable product over advanced architecture.
- Keep the implementation simple, readable, and explainable.
- Do not over-engineer.
- Do not add unnecessary libraries, abstractions, microservices, Docker, Redux, GraphQL, etc.
- Use a clean but practical architecture.
- Every important business rule must be implemented on the BACKEND, not only in the frontend.
- Do not fake test results.
- Do not claim something works unless it has actually been tested.
- AI usage is allowed by the assessment.
- I will maintain AI_LOGS.md separately according to the assessment instructions.

============================================================
EXACT PROBLEM STATEMENT
============================================================

THE STORYLINE

A busy multi-level city-centre parking garage has cars coming and going throughout the day.

The parking attendant needs to:

- Check a car in
- Check a car out
- Charge the correct fee
- Find a car by its license plate
- Know whether a parking spot is currently available
- Prevent incorrect parking assignments
- Prevent double-parking

Parking rates are tiered:

- The first hour has one price
- Each additional hour is cheaper
- There is a daily maximum cap
- Part-hours are rounded up

Parking spots are limited and have different types:

- Compact
- Standard
- EV (with a charger)

An EV vehicle MUST get an EV-compatible parking spot.

Drivers frequently ask:

"Is an EV spot free right now?"

The attendant should be able to answer this from live database data.

By the end of the day, the parking activity log may become large.

The goal is to build the attendant a useful system so that:

- every vehicle is charged correctly
- parking spots are assigned correctly
- no spot is double-booked
- EV vehicles only use EV spots
- vehicles can be searched by plate
- parking activity can be managed efficiently

============================================================
TWISTS — THESE ARE MANDATORY
============================================================

The assessment contains three important twists.

------------------------------------------
TWIST T4 — MESSY RATE CARD / LEVEL 1
------------------------------------------

The system must support importing a messy rate card.

The rate card contains rates per parking spot type, but the source data may contain junk/dirty formatting.

The application must:

1. Accept/import the messy rate-card data.
2. Clean/normalize the input.
3. Correctly map rates to the appropriate spot type.
4. Store the cleaned rates in the database.
5. Use the cleaned rates for actual fee calculation.

The cleaned rate card should support at least:

- Spot type
- First hour rate
- Additional hour rate
- Daily maximum

Example conceptual data:

COMPACT:
first hour = ₹50
additional hour = ₹30
daily max = ₹250

STANDARD:
first hour = ₹60
additional hour = ₹40
daily max = ₹300

EV:
first hour = ₹80
additional hour = ₹50
daily max = ₹400

IMPORTANT:
The actual messy rate-card format may be provided separately.

Design the importer so that it can handle realistic messy input such as:

- extra spaces
- inconsistent capitalization
- currency symbols
- unnecessary text
- empty rows
- malformed/irrelevant rows
- different representations of spot types

Do not hardcode the final cleaned values into the fee calculation logic.

Instead:

Messy rate card
      ↓
Normalize / clean
      ↓
Validate
      ↓
Store cleaned rates in DB
      ↓
Fee calculation reads rates from DB

Create a reusable rate-card import service.

If an actual rate-card file/data is available in the project, use that exact format.

If the actual data is not available yet, implement the importer against a clearly documented sample format and make it easy to replace with the provided data.

Also provide a REST endpoint for importing the rate card.

For example:

POST /api/rates/import

And an endpoint to view current rates:

GET /api/rates

Document the exact implementation in README.md.

------------------------------------------
TWIST T2 — AUTOMATION / LEVEL 2
------------------------------------------

Implement the following requirement:

"A nightly job auto-closes and bills any session parked over 24 h."

The automation must:

- Identify active parking sessions that have been parked for more than 24 hours.
- Calculate the correct parking fee.
- Close the parking session.
- Set the checkout/auto-close time.
- Store the calculated amount.
- Release the parking spot.
- Mark the session as automatically closed/billed.
- Make sure the operation is safe to run repeatedly.

IMPORTANT:

The assessment says this is graded via:

POST /clock

Therefore implement:

POST /api/clock

(or POST /clock if that is the API convention used by the project)

This endpoint should simulate the nightly clock/job.

The request should allow a test time to be supplied.

For example conceptually:

POST /api/clock

{
  "currentTime": "2026-09-17T23:59:00Z"
}

The exact request format can be chosen sensibly and documented.

The important part is that the endpoint deterministically runs the auto-close logic.

Do NOT depend only on a real OS cron job because the evaluator needs to trigger the behavior through the API.

The core business logic should be separated into a service such as:

autoCloseOverdueSessions(currentTime)

The service should:

1. Find sessions with status ACTIVE.
2. Check whether currentTime - checkInTime > 24 hours.
3. Calculate the fee using the stored/current rate card.
4. Set checkout/auto-close timestamp.
5. Mark session as AUTO_CLOSED or equivalent.
6. Release the parking spot.
7. Persist the final amount.
8. Ensure the same session cannot be billed twice.

Also provide a way to see auto-closed sessions in parking history.

The README must explain how to test this feature.

------------------------------------------
TWIST T6 — SESSION LIFECYCLE / LEVEL 3
------------------------------------------

Implement:

"Transfer an open session to a different plate (valid hand-off); spot and entry time carry over."

This means an active/open parking session can be transferred from one license plate to another.

Example:

Original:

Plate: RJ14AB1234
Vehicle Type: STANDARD
Spot: S-103
Check-in: 10:30 AM
Status: ACTIVE

The attendant performs a valid hand-off to:

RJ14CD5678

After transfer:

Plate: RJ14CD5678
Vehicle Type: STANDARD
Spot: S-103
Check-in: 10:30 AM
Status: ACTIVE

The parking spot must remain the SAME.

The original entry/check-in time must remain the SAME.

The session must continue as an open/active session.

The new plate should become the current vehicle associated with the active session.

IMPORTANT VALIDATION:

- Source session must exist.
- Source session must currently be ACTIVE.
- New plate must be valid.
- New plate must not already have another ACTIVE session.
- The destination plate cannot be the same as the current plate.
- The parking spot must remain unchanged.
- The original check-in time must remain unchanged.
- Do not create a second active parking session for the same vehicle.
- The transfer should be auditable.

Implement a REST endpoint such as:

POST /api/parking/transfer

Example:

{
  "fromPlate": "RJ14AB1234",
  "toPlate": "RJ14CD5678"
}

You may choose a cleaner endpoint/request format, but document it.

After successful transfer, return:

- New plate
- Parking spot
- Floor
- Original check-in time
- Status

Consider maintaining a small transfer/audit record if practical.

Do NOT unnecessarily complicate the schema.

============================================================
CORE FUNCTIONAL REQUIREMENTS
============================================================

The application MUST support:

1. User registration
2. User login
3. JWT authentication
4. Dashboard
5. Vehicle check-in
6. Automatic parking spot assignment
7. Vehicle checkout
8. Correct parking fee calculation
9. License plate search
10. Active parking sessions
11. Parking history
12. Parking spot availability
13. EV spot availability
14. Pagination
15. Sorting
16. Rate-card import and cleaning
17. Nightly auto-close through POST /clock
18. Open-session transfer to another plate
19. Prevention of double parking
20. Prevention of duplicate active sessions
21. Landing page
22. REST API documentation

============================================================
TECH STACK
============================================================

Use a simple stack suitable for a 2.5-hour implementation.

Preferred:

FRONTEND:
- React
- Vite
- React Router
- CSS / simple styling

BACKEND:
- Node.js
- Express.js

DATABASE:
- SQLite

AUTH:
- JWT
- bcrypt or bcryptjs

API:
- REST
- JSON

If there is a strong reason to change the stack, explain it before doing so.

Do not introduce unnecessary technologies.

============================================================
DATABASE
============================================================

Use a sensible relational schema.

Minimum tables:

users

- id
- name
- email
- password_hash
- created_at

parking_spots

- id
- spot_number
- floor
- spot_type
- is_occupied
- created_at

vehicles

- id
- license_plate
- vehicle_type
- created_at

parking_sessions

- id
- vehicle_id
- parking_spot_id
- check_in_time
- check_out_time
- amount
- status
- created_at
- updated_at

rate_cards

- id
- spot_type
- first_hour_rate
- additional_hour_rate
- daily_max_rate
- created_at
- updated_at

OPTIONALLY:

parking_transfers

- id
- session_id
- old_vehicle_id / old_plate
- new_vehicle_id / new_plate
- transferred_at

Only add this table if it genuinely improves the implementation.

Use proper foreign keys.

Prevent duplicate active sessions at the application/database level where practical.

============================================================
VEHICLE TYPES
============================================================

Supported vehicle types:

- COMPACT
- STANDARD
- EV

============================================================
PARKING SPOT RULES
============================================================

Supported spot types:

- COMPACT
- STANDARD
- EV

Implement clear assignment rules.

At minimum:

COMPACT vehicle:
- Can use a compatible compact spot.
- You may define whether it can use a larger STANDARD spot, but document the decision.

STANDARD vehicle:
- Should use a STANDARD-compatible spot.

EV vehicle:
- MUST use an EV spot.

An EV vehicle must NEVER be assigned to a non-EV spot.

Never assign an occupied spot.

The backend must be the source of truth.

============================================================
PARKING FEE CALCULATION
============================================================

Fee calculation must be based on the imported/cleaned rate card stored in the database.

Rules:

- First hour uses first-hour rate.
- Every additional started hour uses additional-hour rate.
- Part-hours are rounded UP.
- Total amount is capped at daily maximum.

Example:

First hour = ₹50
Additional hour = ₹30
Daily maximum = ₹250

30 minutes -> ₹50
1 hour -> ₹50
1 hour 20 minutes -> ₹80
2 hours -> ₹80
2 hours 10 minutes -> ₹110
10 hours -> ₹250

Create a reusable fee calculation service/function.

Do NOT hardcode rates inside the function.

It should fetch/use the correct rate card based on the spot type.

============================================================
CHECK-IN
============================================================

UI form:

- License plate
- Vehicle type

Backend:

1. Validate input.
2. Normalize license plate.
3. Check whether the vehicle already has an ACTIVE session.
4. Find a suitable available spot.
5. EV must get EV spot.
6. Create/reuse vehicle record.
7. Create parking session.
8. Mark spot occupied.
9. Return confirmation.

Response should contain:

- License plate
- Vehicle type
- Spot number
- Floor
- Check-in time
- Session ID

If no suitable spot:

Return a useful error such as:

"No suitable parking spot is currently available."

============================================================
CHECKOUT
============================================================

Checkout must:

1. Find active session.
2. Calculate parking duration.
3. Calculate fee.
4. Set checkout time.
5. Save final amount.
6. Mark session COMPLETED.
7. Release parking spot.
8. Return a receipt-like response.

Show:

- Plate
- Vehicle type
- Spot
- Check-in
- Check-out
- Duration
- Amount

============================================================
SEARCH
============================================================

Search by license plate.

Example:

RJ14AB1234

Return:

- Vehicle
- Vehicle type
- Current spot
- Floor
- Check-in time
- Status

Search must be implemented through the backend/database.

Do not rely only on frontend filtering.

============================================================
PAGINATION
============================================================

Parking history must support pagination.

Example:

GET /api/parking/history?page=1&limit=10

Return useful metadata:

- records
- page
- limit
- total
- totalPages

============================================================
SORTING
============================================================

Parking history should support sorting.

Example:

GET /api/parking/history?page=1&limit=10&sortBy=check_in_time&order=desc

Support reasonable fields:

- check_in_time
- check_out_time
- amount
- license_plate

Validate sort fields instead of directly trusting arbitrary SQL input.

============================================================
DASHBOARD
============================================================

Dashboard should display:

- Total spots
- Occupied spots
- Available spots
- Available EV spots
- Active vehicles
- Today's revenue
- Auto-closed sessions if useful

Quick actions:

- Check In
- Check Out
- Search Vehicle
- Transfer Session

The EV availability should be clearly visible.

Example:

EV SPOTS
Available: 2 / 5

============================================================
LANDING PAGE
============================================================

Create a one-page landing page.

It must explain:

1. What the product is
2. Key features
3. Target audience
4. How it helps
5. Three features that could be built next

Keep it professional and simple.

Do not spend excessive time on animations.

============================================================
UI PAGES
============================================================

Create:

1. Landing Page
2. Login
3. Register
4. Dashboard
5. Check In
6. Active Vehicles
7. Parking History
8. Parking Spots
9. Transfer Session
10. Rate Card / Import page if practical

Use reusable components where useful.

============================================================
ERROR HANDLING
============================================================

Handle:

- Duplicate email
- Invalid credentials
- Invalid plate
- Duplicate active vehicle
- Vehicle not found
- No available spot
- EV spot unavailable
- Invalid vehicle type
- Invalid spot type
- Checkout of inactive vehicle
- Invalid transfer
- Source session not active
- Destination plate already active
- Invalid pagination
- Invalid sorting
- Invalid rate-card data
- Unauthorized requests

Return meaningful HTTP status codes.

============================================================
API LIST
============================================================

At minimum implement APIs similar to:

AUTH:

POST /api/auth/register
POST /api/auth/login
GET /api/auth/me

DASHBOARD:

GET /api/dashboard

PARKING:

POST /api/parking/check-in
POST /api/parking/check-out
GET /api/parking/active
GET /api/parking/history
GET /api/parking/search
POST /api/parking/transfer

SPOTS:

GET /api/spots
GET /api/spots/available
GET /api/spots/available/ev

VEHICLES:

GET /api/vehicles/:licensePlate

RATES:

POST /api/rates/import
GET /api/rates

AUTOMATION:

POST /api/clock

You may change endpoint naming if you have a better REST design.

However, POST /clock functionality MUST exist because the assessment explicitly says the automation is graded via POST /clock.

Document the exact routes actually implemented.

============================================================
SEED DATA
============================================================

Create a small seed script.

Example:

Floor 1:

C-101 COMPACT
C-102 COMPACT
S-103 STANDARD
S-104 STANDARD
EV-105 EV

Floor 2:

C-201 COMPACT
S-202 STANDARD
EV-203 EV

Create sample rate-card data.

Also create a demo user if appropriate.

If demo credentials are provided, document them in README.md.

============================================================
TEST DATA FOR TWISTS
============================================================

Create practical test scenarios.

T4:

Import messy rate data.

Verify:

messy input
→ cleaned data
→ database
→ correct fee calculation

T2:

Create an active session whose check-in time is more than 24 hours before the simulated clock time.

Call:

POST /api/clock

Verify:

- session closes
- fee is calculated
- spot is released
- status becomes AUTO_CLOSED
- amount is stored

T6:

Create:

Plate A
ACTIVE
Spot S-103
Check-in 10:30

Transfer to:

Plate B

Verify:

- plate becomes B
- spot remains S-103
- check-in remains 10:30
- session remains ACTIVE
- Plate B cannot have another active session

============================================================
DOUBLE PARKING
============================================================

This is a critical business rule.

The backend must prevent:

Vehicle A -> Spot S-103

and then:

Vehicle B -> Spot S-103

at the same time.

Do NOT depend only on frontend state.

Also prevent:

Vehicle A -> active session

and then:

Vehicle A -> another active session.

============================================================
AUTHENTICATION
============================================================

Implement:

- Password hashing
- JWT
- Protected APIs
- No password hash in API responses
- Environment variables for secrets
- .env.example

Do not commit actual secrets.

============================================================
PROJECT STRUCTURE
============================================================

Keep it simple.

Suggested:

server/
  src/
    controllers/
    routes/
    services/
    middleware/
    db/
    utils/
    app.js
    server.js

client/
  src/
    components/
    pages/
    services/
    context/
    utils/
    App.jsx

Do not create unnecessary files.

Business logic should live in services.

Especially keep these separate:

- calculateFee()
- assignParkingSpot()
- autoCloseOverdueSessions()
- transferParkingSession()
- importRateCard()

============================================================
README.md
============================================================

Create a concise but complete README.md.

Include:

# Parking Garage Management System

## Overview

## Problem

## Features

## Tech Stack

## Architecture

## Database Schema

## Project Structure

## Installation

## Environment Variables

## Database Setup

## Seed Data

## Running Backend

## Running Frontend

## API Documentation

For every endpoint provide:

- Method
- Endpoint
- Authentication
- Request body/query parameters
- Description
- Example response

Also document:

## Parking Assignment Rules

## Fee Calculation Rules

## Rate Card Import

## T4 — Messy Rate Card

## T2 — POST /clock Automation

## T6 — Session Transfer

## Search

## Pagination

## Sorting

## Testing

## Known Limitations

## Future Improvements

============================================================
REASONING.md
============================================================

Create REASONING.md.

Document the actual implementation.

Include:

1. Problem understanding
2. Assumptions
3. Architecture choice
4. Database design
5. Parking assignment logic
6. Fee calculation
7. Rate-card cleaning/import logic
8. Authentication
9. Search
10. Pagination
11. Sorting
12. Double-parking prevention
13. EV handling
14. Auto-close logic
15. Session transfer logic
16. Testing performed
17. Actual bugs/issues encountered
18. Actual fixes
19. Trade-offs due to 2.5-hour limit
20. What could be improved with more time

IMPORTANT:

Do not invent bugs, fixes, or test results.

Only document what actually happened.

============================================================
AI_LOGS.md
============================================================

Do NOT fabricate AI_LOGS.md.

The assessment explicitly requires the complete AI conversation pasted as-is.

I will maintain this separately according to the assessment rules.

Do not rewrite, summarize, clean, or alter the conversation for this file.

============================================================
TESTING REQUIREMENTS
============================================================

Prioritize testing these flows:

AUTH:

1. Register
2. Login
3. Protected API

PARKING:

4. Check-in
5. Spot assignment
6. EV assignment
7. Duplicate active vehicle prevention
8. Double-parking prevention
9. Checkout
10. Fee calculation
11. Spot release

SEARCH:

12. Search by plate

HISTORY:

13. Pagination
14. Sorting

T4:

15. Messy rate-card import
16. Cleaned rates stored
17. Fee calculation uses imported rates

T2:

18. POST /clock
19. Auto-close sessions >24 hours
20. Correct billing
21. Spot release
22. Idempotent/repeat-safe behavior

T6:

23. Transfer active session
24. Spot remains unchanged
25. Entry time remains unchanged
26. Destination plate cannot already have active session

UI:

27. Landing page
28. Dashboard
29. Check-in UI
30. Checkout UI
31. Search UI
32. History UI
33. Transfer UI
34. EV availability

============================================================
TIME MANAGEMENT — VERY IMPORTANT
============================================================

The assessment is ONLY 2.5 HOURS.

Use this priority order:

PRIORITY 1:
- Database
- Backend
- Authentication
- Check-in
- Spot assignment
- Checkout
- Fee calculation

PRIORITY 2:
- EV logic
- Search
- History
- Pagination
- Sorting

PRIORITY 3:
- T4 rate-card import
- T2 POST /clock automation
- T6 session transfer

PRIORITY 4:
- Dashboard
- Landing page
- UI polish
- Documentation

Do NOT spend 45 minutes making the UI beautiful while core backend functionality is incomplete.

Do NOT add unnecessary features.

Do NOT add:
- notifications
- payment gateway
- maps
- analytics
- complex admin roles
- microservices
- Docker unless absolutely required
- complicated state management

unless there is significant time remaining.

============================================================
DEVELOPMENT MODE
============================================================

Work in phases.

PHASE 1:
Give me:

- Architecture
- Database schema
- Folder structure
- API list
- Business rules
- Time-saving implementation plan

Do not generate the entire application in one response.

PHASE 2:
Build the backend and database first.

PHASE 3:
Build the frontend.

PHASE 4:
Integrate frontend + backend.

PHASE 5:
Implement and verify T4, T2 and T6.

PHASE 6:
Run practical tests.

PHASE 7:
Create README.md and REASONING.md.

PHASE 8:
Perform a final requirement-by-requirement audit.

============================================================
FINAL AUDIT
============================================================

Before declaring the project complete, check every item:

[ ] Registration
[ ] Login
[ ] JWT authentication
[ ] Persistent database
[ ] Parking spot schema
[ ] Vehicle schema
[ ] Parking session schema
[ ] Rate card schema
[ ] Check-in
[ ] Correct spot assignment
[ ] EV-only spot assignment
[ ] Double-parking prevention
[ ] Duplicate active session prevention
[ ] Checkout
[ ] Correct fee calculation
[ ] Daily maximum
[ ] Part-hour rounding
[ ] Search by license plate
[ ] Active sessions
[ ] Parking history
[ ] Pagination
[ ] Sorting
[ ] EV availability
[ ] T4 messy rate-card import
[ ] T4 cleaned rates persisted
[ ] T4 fee calculation uses imported rates
[ ] T2 POST /clock
[ ] T2 auto-close >24h
[ ] T2 billing
[ ] T2 spot release
[ ] T2 repeat-safe behavior
[ ] T6 session transfer
[ ] T6 spot carries over
[ ] T6 entry time carries over
[ ] T6 duplicate active plate prevention
[ ] Dashboard
[ ] Landing page
[ ] README.md
[ ] REASONING.md
[ ] .env.example
[ ] No secrets committed
[ ] Clean setup works
[ ] Critical flows tested

START NOW.

First provide PHASE 1 only:
- Recommended architecture
- Database schema
- Folder structure
- API list
- Business rules
- T4/T2/T6 implementation approach
- 2.5-hour execution plan

Do not start generating the complete code until the architecture is clear.
