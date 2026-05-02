import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })

    const zones = await prisma.geofenceZone.findMany({
      where: { tenantId: session.user.tenantId }
    })

    return NextResponse.json({ success: true, zones })
  } catch (error) {
    console.error("[GEOFENCE_GET_ERROR]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user || !session.user.isSuperAdmin) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const { name, lat, lng, radius, color } = await req.json()
    if (!name || lat === undefined || lng === undefined || !radius) {
      return NextResponse.json({ error: "Dati mancanti" }, { status: 400 })
    }

    const zone = await prisma.geofenceZone.create({
      data: {
        tenantId: session.user.tenantId,
        name,
        lat,
        lng,
        radius,
        color: color || "#ef4444"
      }
    })

    return NextResponse.json({ success: true, zone })
  } catch (error) {
    console.error("[GEOFENCE_POST_ERROR]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth()
    if (!session?.user || !session.user.isSuperAdmin) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) return NextResponse.json({ error: "ID mancante" }, { status: 400 })

    await prisma.geofenceZone.delete({
      where: { id, tenantId: session.user.tenantId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[GEOFENCE_DELETE_ERROR]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
