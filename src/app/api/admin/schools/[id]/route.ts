import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && !session?.user?.canConfigureSystem) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const { name, schedules } = await req.json()
    const tenantId = session.user.tenantId

    // 1. Update School Name
    await prisma.school.update({
      where: { id, tenantId },
      data: { name }
    })

    // 2. Update Schedules in bulk or individually
    if (schedules && Array.isArray(schedules)) {
      for (const sch of schedules) {
        await prisma.schoolSchedule.upsert({
          where: { schoolId_dayOfWeek: { schoolId: id, dayOfWeek: sch.dayOfWeek } },
          update: {
            entranceTime: sch.entranceTime,
            exitTime: sch.exitTime
          },
          create: {
            schoolId: id,
            dayOfWeek: sch.dayOfWeek,
            entranceTime: sch.entranceTime,
            exitTime: sch.exitTime
          }
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[SCHOOL PUT]", error)
    return NextResponse.json({ error: "Errore durante l'aggiornamento" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && !session?.user?.canConfigureSystem) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const tenantId = session.user.tenantId

    await prisma.school.delete({
      where: { id, tenantId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Errore durante l'eliminazione" }, { status: 500 })
  }
}
