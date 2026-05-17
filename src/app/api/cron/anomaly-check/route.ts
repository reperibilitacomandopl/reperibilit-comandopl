import { NextResponse } from "next/server"
import { checkAllTenantsAnomalies } from "@/lib/anomaly-detector"

export async function GET(request: Request) {
  // Verifica CRON_SECRET
  const authHeader = request.headers.get("authorization")
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null
  const expected = process.env.CRON_SECRET

  if (expected && token !== expected) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  }

  try {
    await checkAllTenantsAnomalies()
    return NextResponse.json({ success: true, message: "Controllo anomalie completato" })
  } catch (error) {
    console.error("[CRON_ANOMALY_ERROR]", error)
    return NextResponse.json({ error: "Errore durante il controllo" }, { status: 500 })
  }
}
