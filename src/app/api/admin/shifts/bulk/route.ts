import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { notifyAdminActivity } from "@/lib/telegram"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user || (session.user.role !== "ADMIN" && !session.user.canManageShifts)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { agentId, startDate, endDate, code, notes } = await req.json()
    const tenantId = session.user.tenantId

    if (!agentId || !startDate || !endDate || !code) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const start = new Date(startDate)
    const end = new Date(endDate)
    const upperCode = code.toUpperCase()
    
    // Determiniamo se è una reperibilità manuale
    const isRep = upperCode.includes("REP")
    const finalRepType = isRep ? "rep_m" : null
    const finalType = isRep ? "RP" : upperCode

    const updates = []
    let currentDate = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()))
    const lastDate = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()))

    while (currentDate <= lastDate) {
      const dateToSave = new Date(currentDate)
      updates.push(
        prisma.shift.upsert({
          where: {
            userId_date_tenantId: {
              userId: agentId,
              date: dateToSave,
              tenantId: tenantId || ""
            }
          },
          update: {
            type: finalType,
            repType: finalRepType
          },
          create: {
            userId: agentId,
            date: dateToSave,
            tenantId: tenantId || null,
            type: finalType,
            repType: finalRepType
          }
        })
      )
      currentDate.setUTCDate(currentDate.getUTCDate() + 1)
    }

    await prisma.$transaction(updates)

    // Audit Log
    const agent = await prisma.user.findUnique({ where: { id: agentId }, select: { name: true } })
    await notifyAdminActivity(
      `📑 <b>Inserimento Massivo Turni</b>\n\n` +
      `👤 Operatore: ${agent?.name || 'Sconosciuto'}\n` +
      `📅 Periodo: ${start.toLocaleDateString()} - ${end.toLocaleDateString()}\n` +
      `⚙️ Codice: ${upperCode}\n` +
      `👤 Admin: ${session.user.name}`,
      tenantId || undefined
    )

    return NextResponse.json({ success: true, count: updates.length })
  } catch (error) {
    console.error("[SHIFTS BULK POST]", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
