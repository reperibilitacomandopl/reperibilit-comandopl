import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { privacyConsent, gpsConsent } = await req.json()
    
    const updateData: any = {}
    if (privacyConsent === true) {
      updateData.privacyConsent = true
      updateData.privacyAcceptedAt = new Date()
    }
    if (gpsConsent !== undefined) {
      updateData.gpsConsent = gpsConsent
      updateData.gpsAcceptedAt = new Date()
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No data provided" }, { status: 400 })
    }

    const updatedUser = await (prisma.user.update as any)({
      where: { id: session.user.id },
      data: updateData
    })

    return NextResponse.json({ 
      success: true, 
      privacyConsent: (updatedUser as any).privacyConsent,
      gpsConsent: (updatedUser as any).gpsConsent,
      privacyAcceptedAt: (updatedUser as any).privacyAcceptedAt,
      gpsAcceptedAt: (updatedUser as any).gpsAcceptedAt
    })
  } catch (error) {
    console.error("[CONSENT UPDATE ERROR]", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Error", stack: error instanceof Error ? error.stack : undefined }, { status: 500 })
  }
}
