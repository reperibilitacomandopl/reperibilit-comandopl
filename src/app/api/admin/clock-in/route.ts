// @ts-nocheck
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// Calcolo distanza tra due punti in metri (Haversine)
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3 // Raggio della terra in metri
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user || (session.user.role !== "ADMIN" && !session?.user?.canVerifyClockIns)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const tenantId = session.user.tenantId
  if (!tenantId) return NextResponse.json({ error: "No Tenant" }, { status: 400 })

  try {
    const records = await prisma.clockRecord.findMany({
      where: { tenantId },
      include: { user: { select: { name: true, matricola: true } } },
      orderBy: { timestamp: "desc" },
      take: 200
    })
    return NextResponse.json({ records })
  } catch (error) {
    console.error("[CLOCK_GET]", error)
    return NextResponse.json({ error: "Error fetching records" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { type, lat, lng, accuracy, overtimeReason, isCorrection, shiftId, actualEndTimeStr } = body
    let tenantId = session.user.tenantId
    const userId = session.user.id

    // Fallback: se tenantId manca nella sessione, recuperalo dal DB User
    if (!tenantId) {
      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { tenantId: true }
      })
      tenantId = dbUser?.tenantId
    }

    if (!tenantId) return NextResponse.json({ error: "No Tenant" }, { status: 400 })

    // 1. Fetch Tenant Geofence
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, lat: true, lng: true, clockInRadius: true }
    })

    console.log(`[CLOCK-IN] Tentativo da Utente: ${userId} (${session.user.name}) per Comando: ${tenant?.name}`)
    console.log(`[CLOCK-IN] Coordinate Utente: lat=${lat}, lng=${lng}, precisione=${accuracy}m`)

    if (type === 'IN' && tenant?.lat && tenant?.lng) {
      const distance = getDistance(lat, lng, tenant.lat, tenant.lng)
      const allowed = tenant.clockInRadius || 500
      
      console.log(`[CLOCK-IN] Geofencing (ENTRATA): Distanza calcolata = ${Math.round(distance)}m (Ammessi: ${allowed}m)`)

      if (distance > allowed) {
        console.warn(`[CLOCK-IN] RIFIUTATO: Fuori area. Distanza: ${Math.round(distance)}m`)
        return NextResponse.json({ 
          error: "Troppo lontano dalla sede!", 
          distance: Math.round(distance),
          allowed: allowed 
        }, { status: 403 })
      }
      console.log(`[CLOCK-IN] ACCETTATO: Posizione valida.`)
    } else if (type === 'OUT') {
      console.log(`[CLOCK-IN] USCITA: Geofencing ignorato per uscita remota. Posizione registrata: lat=${lat}, lng=${lng}`)
    } else {
      console.warn(`[CLOCK-IN] ATTENZIONE: Geofencing saltato - Coordinate sede mancanti o tipo non gestito.`)
    }

    // 2. Determine if it's a correction or overtime
    let finalTimestamp = new Date()

    if (actualEndTimeStr && type === 'OUT') {
      const [ah, am] = actualEndTimeStr.split(':').map(Number)
      finalTimestamp.setHours(ah, am, 0, 0)
    }

    if (type === 'OUT' && shiftId) {
      const shift = await prisma.shift.findUnique({
        where: { id: shiftId },
        select: { timeRange: true, date: true }
      })

      if (shift?.timeRange) {
        const [, endTimeStr] = shift.timeRange.split(/[-–]/).map(p => p.trim())
        const [eh, em] = endTimeStr.split(':').map(Number)
        
        const plannedEnd = new Date(shift.date)
        plannedEnd.setHours(eh, em, 0, 0)
        
        // Handle night shifts
        const startTimeStr = shift.timeRange.split(/[-–]/)[0].trim()
        const [sh] = startTimeStr.split(':').map(Number)
        if (eh < sh) plannedEnd.setDate(plannedEnd.getDate() + 1)

        if (isCorrection) {
          finalTimestamp = plannedEnd
        } else if (overtimeReason) {
          const diffMs = finalTimestamp.getTime() - plannedEnd.getTime()
          const diffMins = Math.max(0, Math.floor(diffMs / (1000 * 60)))
          
          if (diffMins >= 15) {
            // Arrotondamento ogni 15 minuti (es. 35 min -> 0.50h, 40 min -> 0.75h se usiamo round)
            // Usiamo round per eccesso ai 15 min per premiare l'agente come da prassi
            const roundedHours = Math.round(diffMins / 15) * 0.25

            if (roundedHours > 0) {
              const { isHoliday } = await import("@/utils/holidays")
              const isFestivo = isHoliday(new Date())
              const { AGENDA_CATEGORIES } = await import("@/utils/agenda-codes")
              let finalCode = "STR_EXTRA"
              let finalNotes = overtimeReason

              const extraReasonMatch = overtimeReason.match(/^(\d{4}|STR_\w+)\b/)
              if (extraReasonMatch) {
                const possibleCode = extraReasonMatch[1]
                const straordGroup = AGENDA_CATEGORIES.find(c => c.group === "Straordinario")
                if (straordGroup?.items.some(i => i.code === possibleCode)) {
                   finalCode = possibleCode
                   // Rimuovi il codice dal testo della nota per non ripeterlo
                   finalNotes = overtimeReason.replace(possibleCode, "").trim()
                }
              }

              await prisma.agentRequest.create({
                data: {
                  userId,
                  tenantId,
                  date: new Date(),
                  code: finalCode,
                  hours: roundedHours,
                  notes: `[AUTO-PROLUNGAMENTO] ${isFestivo ? '(FESTIVO) ' : ''}${finalNotes}`,
                  status: "PENDING"
                }
              })
            }
          }
        }
      }
    }

    // 3. Create Record
    const record = await prisma.clockRecord.create({
      data: {
        userId,
        tenantId,
        timestamp: finalTimestamp,
        type, // "IN" o "OUT"
        lat,
        lng,
        accuracy,
        isVerified: true,
        isManual: !!isCorrection
      }
    })

    // 3. Invia Notifica Push di conferma (anche se in background)
    try {
      const { sendPushNotification } = await import("@/lib/push-notifications")
      await sendPushNotification(userId, {
        title: type === 'IN' ? "✅ Entrata Registrata" : "🏁 Uscita Registrata",
        body: `Operazione delle ${new Date().toLocaleTimeString('it-IT')} completata con successo presso ${tenant?.name || 'Comando'}.`,
        url: `/${session.user.tenantSlug}/admin/timbrature`
      })
    } catch (pushError) {
      console.error("[CLOCK-IN-PUSH] Errore invio notifica:", pushError)
    }

    return NextResponse.json({ record })
  } catch (error) {
    console.error("[CLOCK_POST]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
