# Proposal: PostgreSQL Cache Migration

## Intent
Replace the current file-based JSON caching mechanism with a PostgreSQL database to improve data persistence, query performance, and scalability.

## Scope
- `app/api/gasolineras/route.ts`: Refactor to use Postgres instead of `gasolineras_cache.json`.
- `app/lib/db.ts`: [NEW] Database connection utility using `pg`.
- `data/gasolineras_cache.json`: [DELETE] Remove once migration is stable.

## Approach
1. Install `pg` and `@types/pg`.
2. Create a `stations` table in the `data_fuel` database.
3. Map the Spanish-keyed JSON fields from MINETUR to snake_case SQL columns.
4. Implement a synchronization logic:
   - Check if the database has data and if it's older than 30 minutes.
   - If old or empty: fetch from MINETUR, clear table, and perform a bulk insert.
   - If fresh: read directly from the database.
5. Use SQL for initial filtering (e.g., bounding box) if possible, or keep the Haversine filtering in the API for now but reading from the DB.

## Rollback Plan
Keep the `gasolineras_cache.json` logic commented out or as a fallback until the Postgres implementation is verified.
