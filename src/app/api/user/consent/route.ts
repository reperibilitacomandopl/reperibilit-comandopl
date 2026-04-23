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
    if (gpsConsent === true) {
      updateData.gpsConsent = true
      updateData.gpsAcceptedAt = new Date()
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No data provided" }, { status: 400 })
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData
    })

    return NextResponse.json({ 
      success: true, 
      privacyConsent: updatedUser.privacyConsent,
      gpsConsent: updatedUser.gpsConsent 
    })
  } catch (error) {
    console.error("[CONSENT UPDATE ERROR]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
