import { NextRequest, NextResponse } from "next/server";
import pool from "@/app/lib/db";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const { rows } = await pool.query("SELECT * FROM estaciones_actual WHERE id_gasolinera = $1", [id]);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Station not found" }, { status: 404 });
    }

    const s = rows[0];
    return NextResponse.json({
      station: {
        id: s.id_gasolinera,
        name: s.nombre || s.direccion,
        brand: s.nombre || "Independiente",
        address: s.direccion,
        locality: s.localidad,
        province: s.provincia,
        cp: s.cp,
        schedule: s.horario,
        lat: Number(s.lat),
        lon: Number(s.lon),
        updatedAt: s.actualizado,
        prices: {
          G95: s.precio_g95 ? Number(s.precio_g95) : null,
          G98: s.precio_g98 ? Number(s.precio_g98) : null,
          DIESEL: s.precio_diesel ? Number(s.precio_diesel) : null,
          DIESEL_PLUS: s.precio_diesel_plus ? Number(s.precio_diesel_plus) : null,
          GLP: s.precio_glp ? Number(s.precio_glp) : null,
        },
      }
    });
  } catch (err) {
    console.error("[Station Detail API]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
