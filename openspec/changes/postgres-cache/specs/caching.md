# Spec: Fuel Data Caching via PostgreSQL

## Scenarios

### Scenario 1: Initial Fetch (Empty DB)
**Given** the `stations` table is empty
**When** a request is made to `/api/gasolineras`
**Then** the application MUST fetch data from the MINETUR REST API
**And** it MUST populate the `stations` table with all records
**And** it MUST record the current timestamp as the last update time.

### Scenario 2: Cache Hit (Fresh Data)
**Given** the `stations` table contains data updated less than 30 minutes ago
**When** a request is made to `/api/gasolineras`
**Then** the application SHOULD read data directly from the PostgreSQL database
**And** it SHOULD NOT call the MINETUR API.

### Scenario 3: Cache Expiration (Stale Data)
**Given** the `stations` table contains data updated more than 30 minutes ago
**When** a request is made to `/api/gasolineras`
**Then** the application MUST fetch fresh data from MINETUR
**And** it MUST update the PostgreSQL database with the new records.

### Scenario 4: Data Mapping Integrity
**Given** a station record from MINETUR
**When** saving to the database
**Then** the `IDEESS` MUST map to a unique primary key
**And** coordinates (`Latitud`, `Longitud`) MUST be stored as numeric types
**And** fuel prices MUST be stored as numeric types (mapping "1,669" to 1.669).
