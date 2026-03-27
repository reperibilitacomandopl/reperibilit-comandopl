import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit"

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { month, year, isPublished } = await req.json()
    
    const result = await prisma.monthStatus.upsert({
      where: {
        month_year: { month, year }
      },
      update: {
        isPublished
      },
      create: {
        month,
        year,
        isPublished
      }
    })

    await logAudit({
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
