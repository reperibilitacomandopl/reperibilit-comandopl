import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

const OVERTIME_CODES = [
  "2000", "2050", "2001", "2002", "2003", 
  "2020", "2021", "2022", "2023", 
  "2026", "10001", "10002", "10003", "STRAO"
]

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })

    const tenantId = session.user.tenantId
    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString())
    const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString())

    const firstDay = new Date(Date.UTC(year, month - 1, 1))
    const lastDay = new Date(Date.UTC(year, month, 0, 23, 59, 59))

    // Estrae gli entry di tipo straordinario del mese
    const entries = await prisma.agendaEntry.findMany({
      where: {
        tenantId,
        date: { gte: firstDay, lte: lastDay },
        code: { in: OVERTIME_CODES }
      },
      include: {
        user: { select: { name: true, matricola: true, isUfficiale: true } }
      },
      orderBy: { date: "desc" }
    })

    return NextResponse.json(entries)
  } catch (error) {
    console.error("GET Overtime error:", error)
    return NextResponse.json({ error: "Errore caricamento straordinari" }, { status: 500 })
  }
}

import { logAudit } from "@/lib/audit"

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    
    const tenantId = session.user.tenantId
    const { userId, date, code, hours, note, label } = await request.json()

    if (!userId || !date || !code || hours === undefined) {
      return NextResponse.json({ error: "Dati mancanti" }, { status: 400 })
    }

    const parsedHours = parseFloat(hours)
    if (isNaN(parsedHours)) {
      return NextResponse.json({ error: "Ore non valide" }, { status: 400 })
    }

    const parsedDate = new Date(date)
    const entry = await prisma.agendaEntry.upsert({
      where: {
        userId_date_code_tenantId: {
          userId,
          date: parsedDate,
          code,
          tenantId: tenantId as string
        }
      },
      update: { hours: parsedHours, note, label },
      create: {
        tenantId,
        userId,
        date: parsedDate,
        code,
        label: label || "Straordinario",
        hours: parsedHours,
        note
      }
    })

    // Log Audit
    const targetUser = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } })
    await logAudit({
      tenantId,
      adminId: session.user.id!,
      adminName: session.user.name!,
      action: "REGISTER_OVERTIME",
      targetId: userId,
      targetName: targetUser?.name,
      details: `Registrato straordinario per ${targetUser?.name}: ${parsedHours}h (Cod. ${code})`
    })

    return NextResponse.json(entry)
  } catch (error) {
    console.error("POST Overtime error:", error)
    return NextResponse.json({ error: "Errore salvataggio" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    
    if (!id) return NextResponse.json({ error: "ID mancante" }, { status: 400 })

    const tenantId = session.user.tenantId
    
    const entry = await prisma.agendaEntry.findFirst({
      where: { id, tenantId }
    })

    if (!entry) return NextResponse.json({ error: "Record non trovato" }, { status: 404 })

    await prisma.agendaEntry.delete({
      where: { id }
    })

    // Log Audit
    const targetUser = await prisma.user.findUnique({ where: { id: entry.userId }, select: { name: true } })
    await logAudit({
      tenantId,
      adminId: session.user.id!,
      adminName: session.user.name!,
      action: "DELETE_OVERTIME",
      targetId: entry.id,
      targetName: targetUser?.name,
      details: `Eliminato straordinario per ${targetUser?.name} del ${entry.date.toLocaleDateString()}`
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE Overtime error:", error)
    return NextResponse.json({ error: "Errore eliminazione" }, { status: 500 })
  }
}

