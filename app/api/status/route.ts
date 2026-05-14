import { NextResponse } from "next/server";
import pool from "@/app/lib/db";

export const runtime = "nodejs";

export async function GET() {
  let isIngesting = false;
  let lastUpdated = null;

  try {
    // Read both flags from DB
    const [statusRes, updateRes] = await Promise.all([
      pool.query("SELECT value FROM system_config WHERE key = 'is_ingesting'"),
      pool.query("SELECT MAX(actualizado) as last_update FROM estaciones_actual")
    ]);

    isIngesting = statusRes.rows[0]?.value === 'true';
    
    if (updateRes.rows[0]?.last_update) {
      lastUpdated = new Date(updateRes.rows[0].last_update).toISOString();
    }
  } catch (e) {
    console.error("[API Status] DB query failed:", e);
  }

  return NextResponse.json({
    isIngesting,
    lastUpdated,
  });
}
