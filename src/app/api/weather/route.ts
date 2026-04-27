import { NextResponse } from "next/server"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const lat = searchParams.get("lat") || "41.9028" // Default Rome
    const lon = searchParams.get("lon") || "12.4964"

    // Open-Meteo free API
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto`, {
      next: { revalidate: 3600 } // Cache per 1 ora
    })

    if (!response.ok) throw new Error("Failed to fetch weather")

    const data = await response.json()
    return NextResponse.json(data.current)
  } catch (error) {
    return NextResponse.json({ error: "Errore meteo" }, { status: 500 })
  }
}
