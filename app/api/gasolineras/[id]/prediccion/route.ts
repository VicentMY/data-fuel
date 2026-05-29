import { NextRequest, NextResponse } from "next/server";
import pool from "@/app/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Missing ID" }, { status: 400 });
  }

  const client = await pool.connect();

  try {
    const query = `
      WITH station AS (
        SELECT id_gasolinera, precio_g95, precio_g98, precio_diesel, id_provincia
        FROM estaciones_actual
        WHERE id_gasolinera = $1
      ),
      prov_avg AS (
        SELECT id_provincia, 
               AVG(precio_g95) as avg_g95, 
               AVG(precio_g98) as avg_g98, 
               AVG(precio_diesel) as avg_diesel
        FROM estaciones_actual
        WHERE id_provincia = (SELECT id_provincia FROM station)
        GROUP BY id_provincia
      ),
      pred AS (
        SELECT id_provincia, precio_g95 as pred_g95, precio_g98 as pred_g98, precio_diesel as pred_diesel, fecha
        FROM predicciones_provincia
        WHERE id_provincia = (SELECT id_provincia FROM station) AND fecha >= CURRENT_DATE
        ORDER BY fecha ASC LIMIT 1
      )
      SELECT 
        s.precio_g95 as st_g95, s.precio_g98 as st_g98, s.precio_diesel as st_diesel,
        a.avg_g95, a.avg_g98, a.avg_diesel,
        p.pred_g95, p.pred_g98, p.pred_diesel, p.fecha
      FROM station s
      JOIN prov_avg a ON s.id_provincia = a.id_provincia
      JOIN pred p ON s.id_provincia = p.id_provincia;
    `;

    const dbRes = await client.query(query, [id]);

    if (dbRes.rows.length === 0) {
      return NextResponse.json({ error: "Not found or no predictions available" }, { status: 404 });
    }

    const row = dbRes.rows[0];

    const calculate_prediction = (st_price: number | null, prov_avg: number | null, prov_pred: number | null) => {
      if (!st_price || !prov_avg || !prov_pred || prov_avg === 0) return null;
      return st_price * (prov_pred / prov_avg);
    };

    const pred_g95 = calculate_prediction(parseFloat(row.st_g95), parseFloat(row.avg_g95), parseFloat(row.pred_g95));
    const pred_g98 = calculate_prediction(parseFloat(row.st_g98), parseFloat(row.avg_g98), parseFloat(row.pred_g98));
    const pred_diesel = calculate_prediction(parseFloat(row.st_diesel), parseFloat(row.avg_diesel), parseFloat(row.pred_diesel));

    return NextResponse.json({
      date: row.fecha,
      predictions: {
        g95: pred_g95,
        g98: pred_g98,
        diesel: pred_diesel,
      },
      current: {
        g95: parseFloat(row.st_g95),
        g98: parseFloat(row.st_g98),
        diesel: parseFloat(row.st_diesel),
      }
    });
  } catch (dbErr: any) {
    console.error("DB Query error for station prediction:", dbErr);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  } finally {
    client.release();
  }
}
