import { NextRequest, NextResponse } from "next/server";
import pool from "@/app/lib/db";

export const runtime = "nodejs";

const CACHE_TTL = 30 * 60 * 1000; // 30 minutes in ms

/** Haversine distance in km between two lat/lon points */
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parseSpanishFloat(val: string | undefined): number | null {
  if (!val) return null;
  const parsed = parseFloat(val.replace(",", ".").trim());
  return isNaN(parsed) ? null : parsed;
}

async function syncData() {
  console.log("[DB Sync] Consultando MINETUR...");
  const res = await fetch(
    "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/",
    { headers: { Accept: "application/json" } }
  );

  if (!res.ok) throw new Error(`MINETUR API error: ${res.status}`);
  const data = await res.json();
  const stations = data["ListaEESSPrecio"] as Record<string, string>[];

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("TRUNCATE stations");

    const query = `
      INSERT INTO stations (
        id, name, address, locality, province, cp, schedule, lat, lon, 
        price_g95, price_g98, price_diesel, price_diesel_plus, price_glp, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
    `;

    console.log(`[DB Sync] Insertando ${stations.length} estaciones...`);
    
    // Batch processing to avoid overhead
    for (let i = 0; i < stations.length; i += 100) {
      const batch = stations.slice(i, i + 100);
      await Promise.all(batch.map(s => client.query(query, [
        s["IDEESS"],
        s["Rótulo"],
        s["Dirección"],
        s["Localidad"],
        s["Provincia"],
        s["C.P."],
        s["Horario"],
        parseSpanishFloat(s["Latitud"]),
        parseSpanishFloat(s["Longitud (WGS84)"]),
        parseSpanishFloat(s["Precio Gasolina 95 E5"]),
        parseSpanishFloat(s["Precio Gasolina 98 E5"]),
        parseSpanishFloat(s["Precio Gasoleo A"]),
        parseSpanishFloat(s["Precio Gasoleo Premium"]),
        parseSpanishFloat(s["Precio Gases licuados del petróleo"])
      ])));
    }

    await client.query("COMMIT");
    console.log("[DB Sync] Sincronización completada.");
    return data["Fecha"];
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[DB Sync] Error en la transacción:", err);
    throw err;
  } finally {
    client.release();
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lon = parseFloat(searchParams.get("lon") ?? "");
  const radius = parseFloat(searchParams.get("radius") ?? "5");
  const fuel = searchParams.get("fuel") ?? "G95";

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json({ error: "Coordenadas inválidas" }, { status: 400 });
  }

  try {
    // Verificar si el caché en DB es válido
    const { rows } = await pool.query("SELECT updated_at FROM stations LIMIT 1");
    const lastUpdate = rows[0]?.updated_at;
    const now = new Date();

    if (!lastUpdate || (now.getTime() - new Date(lastUpdate).getTime() > CACHE_TTL)) {
      await syncData();
    }

    // Obtener datos de la DB
    const { rows: stations } = await pool.query("SELECT * FROM stations");

    const fuelFieldMap: Record<string, string> = {
      G95: "price_g95",
      G98: "price_g98",
      DIESEL: "price_diesel",
      DIESEL_PLUS: "price_diesel_plus",
      GLP: "price_glp",
    };

    const fuelField = fuelFieldMap[fuel] ?? fuelFieldMap["G95"];

    const results = stations
      .map((s) => {
        const sLat = Number(s.lat);
        const sLon = Number(s.lon);
        const dist = haversine(lat, lon, sLat, sLon);
        
        if (dist > radius) return null;

        const price = s[fuelField] ? Number(s[fuelField]) : null;

        return {
          id: s.id,
          name: s.name || s.address,
          brand: s.name || "Independiente",
          address: s.address,
          locality: s.locality,
          province: s.province,
          cp: s.cp,
          schedule: s.schedule,
          lat: sLat,
          lon: sLon,
          dist: Math.round(dist * 1000) / 1000,
          price,
          prices: {
            G95: s.price_g95 ? Number(s.price_g95) : null,
            G98: s.price_g98 ? Number(s.price_g98) : null,
            DIESEL: s.price_diesel ? Number(s.price_diesel) : null,
            DIESEL_PLUS: s.price_diesel_plus ? Number(s.price_diesel_plus) : null,
            GLP: s.price_glp ? Number(s.price_glp) : null,
          },
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (a!.price === null && b!.price === null) return a!.dist - b!.dist;
        if (a!.price === null) return 1;
        if (b!.price === null) return -1;
        return a!.price - b!.price;
      });

    return NextResponse.json({
      count: results.length,
      fuel,
      stations: results,
      updatedAt: lastUpdate || now,
      cached: true,
    });
  } catch (err) {
    console.error("[gasolineras API]", err);
    return NextResponse.json(
      { error: "Error al consultar la base de datos o MINETUR" },
      { status: 500 }
    );
  }
}
