import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })

    const { lat, lng } = await req.json()
    if (lat === undefined || lng === undefined) {
      return NextResponse.json({ error: "Coordinate mancanti" }, { status: 400 })
    }

    const userId = session.user.id
    const tenantId = session.user.tenantId

    // 1. Verifica se l'agente è attualmente in servizio (Clocked IN)
    // Cerchiamo l'ultimo record di timbratura dell'utente oggi
    const lastClock = await prisma.clockRecord.findFirst({
      where: { userId, tenantId },
      orderBy: { timestamp: 'desc' }
    })

    // Se l'ultima timbratura non è un "IN", o non esiste, non aggiorniamo la posizione (Privacy)
    if (!lastClock || lastClock.type !== 'IN') {
      return NextResponse.json({ 
        success: false, 
        message: "Tracking disattivato: non sei in servizio." 
      }, { status: 403 })
    }

    // 2. Aggiorna la posizione in tempo reale dell'utente
    await prisma.user.update({
      where: { id: userId },
      data: {
        lastLat: lat,
        lastLng: lng,
        lastSeenAt: new Date()
      }
    })

    // 3. Logica Storico Posizioni (LocationHistory)
    const settings = await prisma.globalSettings.findUnique({
      where: { tenantId }
    })
    const intervalMinutes = settings?.gpsHistoryIntervalMinutes || 60

    const lastHistory = await prisma.locationHistory.findFirst({
      where: { userId, tenantId },
      orderBy: { timestamp: 'desc' }
    })

    let shouldSaveHistory = true
    if (lastHistory) {
      const diffMinutes = (new Date().getTime() - lastHistory.timestamp.getTime()) / 60000
      if (diffMinutes < intervalMinutes) {
        shouldSaveHistory = false
      }
    }

    if (shouldSaveHistory) {
      await prisma.locationHistory.create({
        data: {
          userId,
          tenantId,
          lat,
          lng
        }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[GPS_UPDATE_ERROR]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
