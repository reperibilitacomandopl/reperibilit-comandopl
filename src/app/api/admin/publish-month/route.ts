import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit"

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && !session?.user?.canManageShifts) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const tenantId = session.user.tenantId
    const { month, year, isPublished } = await req.json()
    
    const result = await prisma.monthStatus.upsert({
      where: {
        month_year_tenantId: { month, year, tenantId: tenantId || "" }
      },
      update: {
        isPublished
      },
      create: {
        month: month,
        year: year,
        isPublished: isPublished,
        tenantId: tenantId || null
      }
    })

    await logAudit({
      tenantId: tenantId || null,
      adminId: session.user.id!,
      adminName: session.user.name!,
      action: isPublished ? "PUBLISH_MONTH" : "UNPUBLISH_MONTH",
      details: `${isPublished ? 'Pubblicati' : 'Ritirati'} turni per il periodo ${month}/${year}`
    })

    return NextResponse.json({ success: true, isPublished: result.isPublished })
  } catch (error) {
    console.error("[PUBLISH MONTH ERROR]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
