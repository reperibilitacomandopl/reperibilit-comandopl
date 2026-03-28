import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit"

// PUT: Update or create a single shift/absence for an agent on a specific day
export async function PUT(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { userId, date, type } = await req.json()

    if (!userId || !date) {
      return NextResponse.json({ error: "userId and date are required" }, { status: 400 })
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } })

    if (!type || type.trim() === "") {
      // Logic: if clearing, we first try to remove the Reperibilità layer.
      // If there was no Reperibilità, we clear the base shift.
      const currentShift = await prisma.shift.findUnique({
        where: { userId_date: { userId, date: new Date(date) } }
      })

      if (currentShift?.repType) {
        // Clear only REPERIBILITÀ, keep base shift
        await prisma.shift.update({
          where: { id: currentShift.id },
          data: { repType: null }
        })
      } else {
        // Clear everything (or just the base shift)
        await prisma.shift.deleteMany({
          where: { userId, date: new Date(date) }
        })
      }

      await logAudit({
        adminId: session.user.id!,
        adminName: session.user.name!,
        action: "CLEAR_SHIFT",
        targetId: userId,
        targetName: targetUser?.name,
        details: `Cancellato turno per il giorno ${new Date(date).toLocaleDateString("it-IT")}`
      })

      return NextResponse.json({ success: true, action: "cleared" })
    }

    const value = type.trim().toUpperCase()
    const isRep = value.includes("REP")

    // Upsert the shift
    await prisma.shift.upsert({
      where: {
        userId_date: {
          userId,
          date: new Date(date)
        }
      },
      update: isRep ? { repType: value } : { type: value, repType: null },
      create: {
        userId,
        date: new Date(date),
        type: isRep ? "" : value,
        repType: isRep ? value : null
      }
    })

    await logAudit({
      adminId: session.user.id!,
      adminName: session.user.name!,
      action: "UPDATE_SHIFT",
      targetId: userId,
      targetName: targetUser?.name,
      details: `Aggiornato turno a ${value} per il giorno ${new Date(date).toLocaleDateString("it-IT")}`
    })

    return NextResponse.json({ success: true, action: "saved" })
  } catch (error) {
    console.error("[EDIT SHIFT ERROR]", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
