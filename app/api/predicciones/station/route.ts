import { NextResponse } from "next/server";

const PYTHON_SERVICE = process.env.PREDICT_SERVICE_URL ?? "http://localhost:8001";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  try {
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const res = await fetch(`${PYTHON_SERVICE}/predict/station/${id}`, {
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) return NextResponse.json({ error: "No prediction" }, { status: res.status });
    
    return NextResponse.json(await res.json());
  } catch (err) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
}
