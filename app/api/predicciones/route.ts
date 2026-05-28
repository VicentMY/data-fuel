import { NextRequest, NextResponse } from "next/server";
import pool from "@/app/lib/db";

const PYTHON_SERVICE = process.env.PREDICT_SERVICE_URL ?? "http://localhost:8001";

export async function GET(req: NextRequest) {
  try {
    const idProvincia = req.nextUrl.searchParams.get("id_provincia");

    if (idProvincia) {
      const client = await pool.connect();
      try {
        const query = `
          SELECT precio_g95, precio_g98, precio_diesel, mae_g95, mae_g98, mae_diesel, creado_en, fecha
          FROM predicciones_provincia 
          WHERE id_provincia = $1 AND fecha >= CURRENT_DATE 
          ORDER BY fecha ASC
          LIMIT 1
        `;
        const dbRes = await client.query(query, [idProvincia]);
        
        if (dbRes.rows.length > 0) {
          const row = dbRes.rows[0];
          const predictions: Record<string, number> = {
            g95: parseFloat(row.precio_g95),
            g98: parseFloat(row.precio_g98),
            diesel: parseFloat(row.precio_diesel),
          };
          const maes: Record<string, number | null> = {
            g95: row.mae_g95 ? parseFloat(row.mae_g95) : null,
            g98: row.mae_g98 ? parseFloat(row.mae_g98) : null,
            diesel: row.mae_diesel ? parseFloat(row.mae_diesel) : null,
          };
          
          return NextResponse.json({
            date: row.fecha,
            predictions,
            mae: maes,
            trained_at: row.creado_en,
            training_in_progress: false
          });
        }
      } catch (dbErr) {
        console.error("DB Query error for predictions:", dbErr);
      } finally {
        client.release();
      }
    }

    const res = await fetch(`${PYTHON_SERVICE}/predict/tomorrow`, {
      // Next.js fetch — revalidate every 30 min, but don't block on stale
      next: { revalidate: 1800 },
      signal: AbortSignal.timeout(30_000), // 30 s timeout
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ detail: res.statusText }));
      return NextResponse.json(
        { error: body.detail ?? "Prediction service error" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Prediction service unreachable";
    console.error("[/api/predicciones]", message);
    return NextResponse.json(
      { error: "Servicio de predicción no disponible", detail: message },
      { status: 503 }
    );
  }
}

// Trigger manual retraining
export async function POST() {
  try {
    const res = await fetch(`${PYTHON_SERVICE}/train`, {
      method: "POST",
      signal: AbortSignal.timeout(5_000),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Prediction service unreachable";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
