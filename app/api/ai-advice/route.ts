import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { provincia, precio_actual, prediccion } = body;

    if (!provincia || precio_actual === undefined || prediccion === undefined) {
      return NextResponse.json({ error: "Faltan parámetros requeridos" }, { status: 400 });
    }

    const prompt = `Eres un asistente que ayuda al usuario a ahorrar en combustible. Genera un consejo corto, natural y amigable recomendandole que hacer. El precio medio de hoy en ${provincia} es ${precio_actual}€, y mi modelo predice que mañana será de ${prediccion}€. Máximo entre 30 y 40 palabras, evita explicaciones técnicas y utilizar el saludo "hola".`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "No API key configured" }, { status: 500 });
    }

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ]
      })
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini API error: ${err}`);
    }

    const data = await res.json();
    const message = data.candidates?.[0]?.content?.parts?.[0]?.text || "No se pudo generar un consejo.";

    return NextResponse.json({ advice: message });
  } catch (error: any) {
    console.error("Error in AI Advice:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
