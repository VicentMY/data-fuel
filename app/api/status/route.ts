import { NextResponse } from "next/server";
import pool from "@/app/lib/db";

export const runtime = "nodejs";

export async function GET() {
  let isIngesting = false;
  let lastUpdated = null;
  let apiStatus = "online";

  try {
    // Read flags and api status from DB
    const [statusRes, updateRes, apiStatusRes] = await Promise.all([
      pool.query("SELECT value FROM system_config WHERE key = 'is_ingesting'"),
      pool.query("SELECT value FROM system_config WHERE key = 'last_full_update'"),
      pool.query("SELECT value FROM system_config WHERE key = 'api_status'")
    ]);

    isIngesting = statusRes.rows[0]?.value === 'true';
    
    if (updateRes.rows[0]?.value) {
      lastUpdated = new Date(updateRes.rows[0].value).toISOString();
    }

    if (apiStatusRes.rows[0]?.value) {
      apiStatus = apiStatusRes.rows[0].value;
    }
  } catch (e) {
    console.error("[API Status] DB query failed:", e);
  }

  return NextResponse.json({
    isIngesting,
    lastUpdated,
    apiStatus,
  });
}
