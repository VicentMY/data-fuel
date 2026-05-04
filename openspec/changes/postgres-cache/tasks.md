# Tasks: PostgreSQL Cache Migration

## Phase 1: Infrastructure & Setup
- [ ] Install dependencies: `npm install pg` and `npm install -D @types/pg`
- [ ] Create `app/lib/db.ts` with connection pool
- [ ] Verify connection to local PostgreSQL database

## Phase 2: Database Initialization
- [ ] Create SQL script for `stations` table creation
- [ ] Execute script to initialize schema in `data_fuel` DB

## Phase 3: Implementation
- [ ] Implement `fetchAndSync` logic to populate DB from MINETUR
- [ ] Refactor `app/api/gasolineras/route.ts` to:
    - [ ] Check cache timestamp from DB
    - [ ] Trigger sync if necessary
    - [ ] Query stations from DB
    - [ ] Apply Haversine filtering and formatting
- [ ] Implement price parsing logic for Spanish format ("1,234" -> 1.234)

## Phase 4: Verification & Cleanup
- [ ] Verify API response matches previous JSON-based response
- [ ] Test cache expiration behavior
- [ ] Delete `data/gasolineras_cache.json` and remove `fs` imports from route
- [ ] [Optional] Optimize SQL query with a bounding box check
