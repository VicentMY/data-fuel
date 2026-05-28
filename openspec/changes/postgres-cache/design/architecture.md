# Design: PostgreSQL Cache Architecture

## Architecture Overview

The system will transition from a single-file JSON blob to a relational table. This allows for better data integrity and the possibility of future SQL-based spatial queries.

## Database Schema

Table: `stations`

| Column | Type | Description | MINETUR Key |
|--------|------|-------------|-------------|
| id | VARCHAR(50) | Primary Key | IDEESS |
| name | VARCHAR(255) | Station Name | Rótulo |
| address | TEXT | Address | Dirección |
| locality | VARCHAR(255) | Locality | Localidad |
| province | VARCHAR(255) | Province | Provincia |
| cp | VARCHAR(10) | Postal Code | C.P. |
| schedule | TEXT | Opening hours | Horario |
| lat | NUMERIC(10, 7) | Latitude | Latitud |
| lon | NUMERIC(10, 7) | Longitude | Longitud (WGS84) |
| price_g95 | NUMERIC(5, 3) | Price G95 | Precio Gasolina 95 E5 |
| price_g98 | NUMERIC(5, 3) | Price G98 | Precio Gasolina 98 E5 |
| price_diesel | NUMERIC(5, 3) | Price Diesel | Precio Gasoleo A |
| price_diesel_plus | NUMERIC(5, 3) | Price Diesel Plus | Precio Gasoleo Premium |
| price_glp | NUMERIC(5, 3) | Price GLP | Precio Gases licuados del petróleo |
| updated_at | TIMESTAMP | Last sync time | (Computed) |

## Database Connection

We will use `pg` with a connection pool to handle multiple requests efficiently.

```typescript
// app/lib/db.ts
import { Pool } from 'pg';

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'data_fuel',
  user: 'postgres',
  password: '12344321',
});

export default pool;
```

## Synchronization Flow

1. `GET /api/gasolineras`
2. `SELECT updated_at FROM stations LIMIT 1`
3. If `now - updated_at > 30 min` OR `no results`:
   - Fetch MINETUR JSON
   - `TRUNCATE stations` (or use a temporary table and rename for zero-downtime)
   - `INSERT` all stations in batches.
4. `SELECT * FROM stations` (with optional bounding box filter based on `lat`, `lon`, `radius`)
5. Return results to client.
