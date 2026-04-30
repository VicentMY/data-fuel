import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";

const CACHE_FILE = path.join(process.cwd(), "data", "gasolineras_cache.json");
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

async function getCachedData() {
  try {
    const stats = await fs.stat(CACHE_FILE);
    const now = Date.now();
    
    if (now - stats.mtimeMs < CACHE_TTL) {
      console.log("[Cache] Usando caché local:", CACHE_FILE);
      const content = await fs.readFile(CACHE_FILE, "utf-8");
      return JSON.parse(content);
    }
    console.log("[Cache] Caché expirado o no válido.");
  } catch (err) {
    console.log("[Cache] No existe caché local.");
  }
  return null;
}

async function saveCacheData(data: any) {
  try {
    await fs.writeFile(CACHE_FILE, JSON.stringify(data), "utf-8");
    console.log("[Cache] Caché guardado correctamente.");
  } catch (err) {
    console.error("[Cache] Error al guardar caché:", err);
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
    let data = await getCachedData();

    if (!data) {
      console.log("[API] Consultando MINETUR (esto puede tardar)...");
      const res = await fetch(
        "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/",
        {
          headers: { Accept: "application/json" },
        }
      );

      if (!res.ok) throw new Error(`MINETUR API error: ${res.status}`);
      data = await res.json();
      
      // Guardar en caché sin esperar para no bloquear
      saveCacheData(data);
    }

    const stations = data["ListaEESSPrecio"] as Record<string, string>[];

    const fuelFieldMap: Record<string, string> = {
      G95: "Precio Gasolina 95 E5",
      G98: "Precio Gasolina 98 E5",
      DIESEL: "Precio Gasoil A",
      DIESEL_PLUS: "Precio Gasoil Premium",
      GLP: "Precio Gases licuados del petróleo",
    };

    const fuelField = fuelFieldMap[fuel] ?? fuelFieldMap["G95"];

    const results = stations
      .map((s) => {
        const sLat = parseSpanishFloat(s["Latitud"]);
        const sLon = parseSpanishFloat(s["Longitud (WGS84)"]);
        if (sLat === null || sLon === null) return null;

        const dist = haversine(lat, lon, sLat, sLon);
        if (dist > radius) return null;

        const price = parseSpanishFloat(s[fuelField]);

        return {
          id: s["IDEESS"],
          name: s["Rótulo"] || s["Dirección"],
          brand: s["Rótulo"] || "Independiente",
          address: s["Dirección"],
          locality: s["Localidad"],
          province: s["Provincia"],
          cp: s["C.P."],
          schedule: s["Horario"],
          lat: sLat,
          lon: sLon,
          dist: Math.round(dist * 1000) / 1000, // km, 3 decimals
          price,
          prices: {
            G95: parseSpanishFloat(s["Precio Gasolina 95 E5"]),
            G98: parseSpanishFloat(s["Precio Gasolina 98 E5"]),
            DIESEL: parseSpanishFloat(s["Precio Gasoil A"]),
            DIESEL_PLUS: parseSpanishFloat(s["Precio Gasoil Premium"]),
            GLP: parseSpanishFloat(s["Precio Gases licuados del petróleo"]),
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
      updatedAt: data["Fecha"],
      cached: true, // Informar al cliente que es caché
    });
  } catch (err) {
    console.error("[gasolineras API]", err);
    return NextResponse.json(
      { error: "Error al consultar la API del MINETUR" },
      { status: 500 }
    );
  }
}
