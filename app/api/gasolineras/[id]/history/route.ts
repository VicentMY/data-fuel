import { NextRequest, NextResponse } from "next/server";
import pool from "@/app/lib/db";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // Fetch history (all)
    const query = `
      SELECT 
        actualizado as date,
        precio_g95 as g95,
        precio_g98 as g98,
        precio_diesel as diesel,
        precio_diesel_plus as diesel_plus,
        precio_glp as glp
      FROM estaciones_historico
      WHERE id_gasolinera = $1
      ORDER BY actualizado ASC
    `;

    const { rows } = await pool.query(query, [id]);

    return NextResponse.json({
      history: rows.map(r => ({
        date: r.date,
        g95: r.g95 ? Number(r.g95) : null,
        g98: r.g98 ? Number(r.g98) : null,
        diesel: r.diesel ? Number(r.diesel) : null,
        diesel_plus: r.diesel_plus ? Number(r.diesel_plus) : null,
        glp: r.glp ? Number(r.glp) : null,
      }))
    });
  } catch (err) {
    console.error("[Station History API]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
