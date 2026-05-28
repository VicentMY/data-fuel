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
    // Obtener datos de la DB
    const { rows: stations } = await pool.query("SELECT * FROM estaciones_actual");

    const fuelFieldMap: Record<string, string> = {
      G95: "precio_g95",
      G98: "precio_g98",
      DIESEL: "precio_diesel",
      DIESEL_PLUS: "precio_diesel_plus",
      GLP: "precio_glp",
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
          id: s.id_gasolinera,
          name: s.nombre || s.direccion,
          brand: s.nombre || "Independiente",
          address: s.direccion,
          locality: s.localidad,
          province: s.provincia,
          id_provincia: s.id_provincia,
          cp: s.cp,
          schedule: s.horario,
          lat: sLat,
          lon: sLon,
          dist: Math.round(dist * 1000) / 1000,
          price,
          updatedAt: s.actualizado,
          prices: {
            G95: s.precio_g95 ? Number(s.precio_g95) : null,
            G98: s.precio_g98 ? Number(s.precio_g98) : null,
            DIESEL: s.precio_diesel ? Number(s.precio_diesel) : null,
            DIESEL_PLUS: s.precio_diesel_plus ? Number(s.precio_diesel_plus) : null,
            GLP: s.precio_glp ? Number(s.precio_glp) : null,
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
      cached: true,
    });
  } catch (err) {
    console.error("[gasolineras API]", err);
    return NextResponse.json(
      { error: "Error al consultar la base de datos" },
      { status: 500 }
    );
  }
}
