import pool from "@/app/lib/db";
import { Worker } from "worker_threads";
import path from "path";

const URL_BASE = "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/";

// Module-level singleton — shared across all imports in the same Node.js process
export let isIngesting = false;
export let ingestionLastUpdated: Date | null = null;

export async function runInitialIngestion() {
  const client = await pool.connect();
  let nextRunMs = 30 * 60 * 1000; // Default to 30 minutes
  try {
    // 1. Ensure system_config exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_config (
        key VARCHAR(50) PRIMARY KEY,
        value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Set ingesting status in DB for cross-process visibility
    await client.query("INSERT INTO system_config (key, value) VALUES ('is_ingesting', 'true') ON CONFLICT (key) DO UPDATE SET value = 'true'");

    // 2. Check if FULL initial ingestion is complete
    const initResult = await client.query("SELECT value FROM system_config WHERE key = 'initial_ingestion_complete'");
    const isInitComplete = initResult.rows.length > 0 && initResult.rows[0].value === 'true';

    if (!isInitComplete) {
      console.log("Starting FULL initial ingestion (tables, metadata, history)...");
      await createTables(client);
      await insertComunidades(client);
      await insertProvincias(client);
      await insertMunicipios(client);
      await insertDatosActuales(client);

      const hoy = new Date();
      const fInicio = new Date(2026, 0, 1);
      const fFin = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 1);
      await insertHistoricoMultithreaded(fInicio, fFin);
      await client.query(
        "INSERT INTO system_config (key, value) VALUES ('last_historic_date', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
        [fFin.toISOString()]
      );

      await client.query("INSERT INTO system_config (key, value) VALUES ('initial_ingestion_complete', 'true') ON CONFLICT (key) DO UPDATE SET value = 'true'");
      console.log("Full initial ingestion completed.");
    } else {
      // 4. Check if we need to update CURRENT data (30 min rule)
      const lastUpdateRes = await client.query("SELECT value FROM system_config WHERE key = 'last_full_update'");
      const lastUpdate = lastUpdateRes.rows[0]?.value;
      const now = new Date();

      if (lastUpdate) {
        const timeDiff = now.getTime() - new Date(lastUpdate).getTime();
        const maxAge = 30 * 60 * 1000;
        if (timeDiff < maxAge) {
          nextRunMs = maxAge - timeDiff;
          console.log(`[Ingestion] Data is fresh (updated ${Math.round(timeDiff / 60000)} mins ago). Next check at ${new Date(now.getTime() + nextRunMs)}.`);
          return;
        }
      }

      console.log("[Ingestion] Data is stale (> 30 mins). Updating current prices...");
      try {
        await insertDatosActuales(client);
        console.log("[Ingestion] Current prices updated successfully.");
      } catch (err) {
        console.warn("[Ingestion] Could not update current prices because the API is offline. Keeping existing database data.");
      }

      // Check if historical data is up to date
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const lastHistoricRes = await client.query(
        "SELECT value FROM system_config WHERE key = 'last_historic_date'"
      );
      const lastHistoricRaw = lastHistoricRes.rows[0]?.value;
      const lastHistoric = lastHistoricRaw ? new Date(lastHistoricRaw) : null;

      if (!lastHistoric || lastHistoric < yesterday) {
        const fInicio = lastHistoric
          ? new Date(lastHistoric.getTime() + 24 * 60 * 60 * 1000) // day after last historic
          : new Date(2026, 0, 1);
        const fFin = new Date(yesterday);

        console.log(`[Ingestion] Historical data outdated. Filling gap: ${fInicio.toDateString()} → ${fFin.toDateString()}`);
        try {
          await insertHistoricoMultithreaded(fInicio, fFin);
          await client.query(
            "INSERT INTO system_config (key, value) VALUES ('last_historic_date', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
            [fFin.toISOString()]
          );
          console.log("[Ingestion] Historical gap filled and last_historic_date updated.");
        } catch (histErr) {
          console.error("[Ingestion] Failed to fill historical gap:", histErr);
        }
      } else {
        console.log(`[Ingestion] Historical data is current (last: ${lastHistoricRaw}).`);
      }
    }

  } catch (error) {
    console.error("Error during ingestion:", error);
  } finally {
    // Always clear ingesting status in DB
    try {
      await pool.query("UPDATE system_config SET value = 'false' WHERE key = 'is_ingesting'");
    } catch (e) {}
    
    if (client) {
      try {
        client.release();
      } catch (e) {
        console.error("Error releasing DB client:", e);
      }
    }
    
    // Schedule next run
    console.log(`[Ingestion] Scheduling next check in ${Math.round(nextRunMs / 60000)} minutes (${new Date(new Date().getTime() + nextRunMs)}).`);
    setTimeout(runInitialIngestion, nextRunMs);
  }
}

async function createTables(client: any) {
  await client.query(`
    BEGIN;
    CREATE TABLE IF NOT EXISTS comunidades_autonomas (idccaa VARCHAR(2) PRIMARY KEY, ccaa VARCHAR(100));
    CREATE TABLE IF NOT EXISTS provincias (idprovincia VARCHAR(2) PRIMARY KEY, idccaa VARCHAR(2) REFERENCES comunidades_autonomas(idccaa), provincia VARCHAR(100));
    CREATE TABLE IF NOT EXISTS municipios (idmunicipio VARCHAR(4) PRIMARY KEY, idprovincia VARCHAR(2) REFERENCES provincias(idprovincia), municipio VARCHAR(100));

    CREATE TABLE IF NOT EXISTS estaciones_actual (
        id_gasolinera VARCHAR(50) PRIMARY KEY,
        nombre VARCHAR(255),
        direccion TEXT,
        localidad VARCHAR(100),
        provincia VARCHAR(100),
        cp VARCHAR(10),
        id_municipio VARCHAR(4) REFERENCES municipios(idmunicipio),
        id_provincia VARCHAR(2) REFERENCES provincias(idprovincia),
        id_ccaa VARCHAR(2) REFERENCES comunidades_autonomas(idccaa),
        horario TEXT,
        lat NUMERIC(10,7),
        lon NUMERIC(10,7),
        precio_g95 NUMERIC(5,3),
        precio_g98 NUMERIC(5,3),
        precio_diesel NUMERIC(5,3),
        precio_diesel_plus NUMERIC(5,3),
        precio_glp NUMERIC(5,3),
        actualizado TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS estaciones_historico (
        id VARCHAR(50) PRIMARY KEY,
        id_gasolinera VARCHAR(50),
        nombre VARCHAR(255),
        direccion TEXT,
        localidad VARCHAR(100),
        provincia VARCHAR(100),
        cp VARCHAR(10),
        id_municipio VARCHAR(4) REFERENCES municipios(idmunicipio),
        id_provincia VARCHAR(2) REFERENCES provincias(idprovincia),
        id_ccaa VARCHAR(2) REFERENCES comunidades_autonomas(idccaa),
        horario TEXT,
        lat NUMERIC(10,7),
        lon NUMERIC(10,7),
        precio_g95 NUMERIC(5,3),
        precio_g98 NUMERIC(5,3),
        precio_diesel NUMERIC(5,3),
        precio_diesel_plus NUMERIC(5,3),
        precio_glp NUMERIC(5,3),
        actualizado TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS predicciones_provincia (
        id_provincia VARCHAR(2) REFERENCES provincias(idprovincia),
        provincia VARCHAR(100),
        fecha DATE,
        precio_g95 NUMERIC(5,3),
        precio_g98 NUMERIC(5,3),
        precio_diesel NUMERIC(5,3),
        mae_g95 NUMERIC(6,4),
        mae_g98 NUMERIC(6,4),
        mae_diesel NUMERIC(6,4),
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id_provincia, fecha)
    );
    COMMIT;
  `);
  console.log("Tables created.");
}

async function insertComunidades(client: any) {
  const res = await fetch(`${URL_BASE}Listados/ComunidadesAutonomas`);
  const data = await res.json();
  for (const item of data) {
    await client.query("INSERT INTO comunidades_autonomas (idccaa, ccaa) VALUES ($1, $2) ON CONFLICT (idccaa) DO NOTHING", [item.IDCCAA, item.CCAA]);
  }
  console.log("Comunidades autonomous inserted.");
}

async function insertProvincias(client: any) {
  const res = await fetch(`${URL_BASE}Listados/Provincias/`);
  const data = await res.json();
  for (const item of data) {
    await client.query("INSERT INTO provincias (idprovincia, idccaa, provincia) VALUES ($1, $2, $3) ON CONFLICT (idprovincia) DO NOTHING", [item.IDPovincia, item.IDCCAA, item.Provincia]);
  }
  console.log("Provincias inserted.");
}

async function insertMunicipios(client: any) {
  const res = await fetch(`${URL_BASE}Listados/Municipios/`);
  const data = await res.json();
  for (const item of data) {
    await client.query("INSERT INTO municipios (idmunicipio, idprovincia, municipio) VALUES ($1, $2, $3) ON CONFLICT (idmunicipio) DO NOTHING", [item.IDMunicipio, item.IDProvincia, item.Municipio]);
  }
  console.log("Municipios inserted.");
}

async function insertDatosActuales(client: any) {
  try {
    const res = await fetch(`${URL_BASE}EstacionesTerrestres`);
    if (!res.ok) {
      throw new Error(`API returned HTTP status ${res.status}`);
    }
    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error(`API returned invalid content type: ${contentType}`);
    }
    const data = await res.json();
    
    // Mark API status as online
    await client.query("INSERT INTO system_config (key, value) VALUES ('api_status', 'online') ON CONFLICT (key) DO UPDATE SET value = 'online'");

    for (const item of data.ListaEESSPrecio) {
      await client.query(`
        INSERT INTO estaciones_actual (id_gasolinera, nombre, direccion, localidad, provincia, cp, id_municipio, id_provincia, id_ccaa, horario, lat, lon, precio_g95, precio_g98, precio_diesel, precio_diesel_plus, precio_glp, actualizado)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        ON CONFLICT (id_gasolinera) DO UPDATE SET
          precio_g95 = EXCLUDED.precio_g95,
          precio_g98 = EXCLUDED.precio_g98,
          precio_diesel = EXCLUDED.precio_diesel,
          precio_diesel_plus = EXCLUDED.precio_diesel_plus,
          precio_glp = EXCLUDED.precio_glp,
          actualizado = EXCLUDED.actualizado
      `, [
        item.IDEESS,
        item.Rótulo,
        item.Dirección,
        item.Localidad,
        item.Provincia,
        item['C.P.'],
        item.IDMunicipio,
        item.IDProvincia,
        item.IDCCAA,
        item.Horario,
        parseFloat(item.Latitud.replace(",", ".")),
        parseFloat(item['Longitud (WGS84)'].replace(",", ".")),
        parsePrice(item['Precio Gasolina 95 E5']),
        parsePrice(item['Precio Gasolina 98 E5']),
        parsePrice(item['Precio Gasoleo A']),
        parsePrice(item['Precio Gasoleo Premium']),
        parsePrice(item['Precio Gases licuados del petróleo']),
        new Date()
      ]);
    }
    await client.query("INSERT INTO system_config (key, value) VALUES ('last_full_update', $1) ON CONFLICT (key) DO UPDATE SET value = $1", [new Date().toISOString()]);
    console.log("Current station data inserted.");
  } catch (error) {
    console.error("[Ingestion] API is offline or returned invalid response:", error);
    try {
      await client.query("INSERT INTO system_config (key, value) VALUES ('api_status', 'offline') ON CONFLICT (key) DO UPDATE SET value = 'offline'");
    } catch (dbErr) {
      console.error("[Ingestion] Failed to write API status to DB:", dbErr);
    }
    throw error; // Re-throw to handle it gracefully in the caller
  }
}

function parsePrice(price: string) {
  if (!price) return null;
  return parseFloat(price.replace(",", "."));
}

async function insertHistoricoMultithreaded(fInicio: Date, fFin: Date) {
  console.log(`Starting multithreaded historical ingestion from ${fInicio.toISOString()} to ${fFin.toISOString()}...`);
  
  const dates: string[] = [];
  let current = new Date(fInicio);
  while (current <= fFin) {
    const day = String(current.getDate()).padStart(2, '0');
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const year = current.getFullYear();
    dates.push(`${day}-${month}-${year}`);
    current.setDate(current.getDate() + 1);
  }

  // Split dates among workers (e.g., 4 workers)
  const numWorkers = 4;
  const chunkSize = Math.ceil(dates.length / numWorkers);
  const workerPromises = [];

  for (let i = 0; i < numWorkers; i++) {
    const chunk = dates.slice(i * chunkSize, (i + 1) * chunkSize);
    if (chunk.length === 0) continue;

    workerPromises.push(new Promise((resolve, reject) => {
      const worker = new Worker(path.join(process.cwd(), "app/lib/workers/historical-worker.js"), {
        workerData: { dates: chunk }
      });
      worker.on('message', (msg) => console.log(`Worker ${i}: ${msg}`));
      worker.on('error', reject);
      worker.on('exit', (code) => {
        if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
        else resolve(null);
      });
    }));
  }

  await Promise.all(workerPromises);
  console.log("Multithreaded historical ingestion completed.");
}
