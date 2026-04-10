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
    const { type, lat, lng, accuracy } = await req.json()
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

    if (tenant?.lat && tenant?.lng) {
      const distance = getDistance(lat, lng, tenant.lat, tenant.lng)
      const allowed = tenant.clockInRadius || 500
      
      console.log(`[CLOCK-IN] Geofencing: Distanza calcolata = ${Math.round(distance)}m (Ammessi: ${allowed}m)`)

      if (distance > allowed) {
        console.warn(`[CLOCK-IN] RIFIUTATO: Fuori area. Distanza: ${Math.round(distance)}m`)
        return NextResponse.json({ 
          error: "Troppo lontano dalla sede!", 
          distance: Math.round(distance),
          allowed: allowed 
        }, { status: 403 })
      }
      console.log(`[CLOCK-IN] ACCETTATO: Posizione valida.`)
    } else {
      console.warn(`[CLOCK-IN] ATTENZIONE: Geofencing saltato - Coordinate sede non configurate per il comando ${tenantId}`)
    }

    // 2. Create Record
    const record = await prisma.clockRecord.create({
      data: {
        userId,
        tenantId,
        type, // "IN" o "OUT"
        lat,
        lng,
        accuracy,
        isVerified: true
      }
    })

    return NextResponse.json({ record })
  } catch (error) {
    console.error("[CLOCK_POST]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
