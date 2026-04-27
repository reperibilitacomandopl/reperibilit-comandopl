// @ts-nocheck
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function PUT(req: Request) {
  const session = await auth()
  if (!session?.user || (session.user.role !== "ADMIN" && !session?.user?.canConfigureSystem)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const tenantId = session.user.tenantId
  if (!tenantId) return NextResponse.json({ error: "No Tenant" }, { status: 400 })

  try {
    const { lat, lng, clockInRadius, logoUrl } = await req.json()
    
    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
        clockInRadius: clockInRadius ? parseInt(clockInRadius) : 500,
        logoUrl: logoUrl || undefined
      }
    })

    return NextResponse.json({ tenant })
  } catch (error) {
    console.error("[TENANT_SETTINGS_PUT]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
