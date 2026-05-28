# Tasks: PostgreSQL Cache Migration

## Phase 1: Infrastructure & Setup
- [x] Install dependencies: `npm install pg` and `npm install -D @types/pg`
- [x] Create `app/lib/db.ts` with connection pool
- [x] Verify connection to local PostgreSQL database

## Phase 2: Database Initialization
- [x] Create SQL script for `stations` table creation
- [x] Execute script to initialize schema in `data_fuel` DB

## Phase 3: Implementation
- [x] Implement `fetchAndSync` logic to populate DB from MINETUR
- [x] Refactor `app/api/gasolineras/route.ts` to:
    - [x] Check cache timestamp from DB
    - [x] Trigger sync if necessary
    - [x] Query stations from DB
    - [x] Apply Haversine filtering and formatting
- [x] Implement price parsing logic for Spanish format ("1,234" -> 1.234)

## Phase 4: Verification & Cleanup
- [x] Verify API response matches previous JSON-based response
- [x] Test cache expiration behavior
- [x] Delete `data/gasolineras_cache.json` and remove `fs` imports from route
- [x] [Optional] Optimize SQL query with a bounding box check
