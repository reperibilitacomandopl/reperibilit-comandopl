import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { shifts, importType } = await req.json()

    if (!shifts || !Array.isArray(shifts) || shifts.length === 0) {
      return NextResponse.json({ error: "Nessun turno da importare" }, { status: 400 })
    }

    // Pre-carica tutti gli utenti UNA SOLA VOLTA
    const allUsers = await prisma.user.findMany({
      where: { role: "AGENTE" },
      select: { id: true, name: true, matricola: true }
    })

    // Mappa veloce per matching in memoria
    const matricolaMap = new Map<string, string>()
    const nameMap = new Map<string, string>()
    allUsers.forEach(u => {
      if (u.matricola) matricolaMap.set(u.matricola, u.id)
      nameMap.set(u.name.toUpperCase().trim(), u.id)
    })

    // Fase 1: Risolvi tutti i match in memoria (zero query DB)
    const resolvedOps: { userId: string; date: Date; type: string }[] = []
    let skipped = 0

    for (const entry of shifts) {
      const { name, matricola, date, type } = entry
      if (!date || !type) continue

      let userId: string | undefined
      if (matricola) userId = matricolaMap.get(matricola)
      if (!userId && name) {
        const n = name.toUpperCase().trim()
        userId = nameMap.get(n)
        if (!userId) {
          for (const [uName, uId] of nameMap) {
            if (uName.includes(n) || n.includes(uName)) { userId = uId; break }
          }
        }
      }
      if (!userId) { skipped++; continue }

      const targetDate = new Date(date)
      targetDate.setUTCHours(0, 0, 0, 0)
      resolvedOps.push({ userId, date: targetDate, type: type.toString().trim() })
    }

    if (resolvedOps.length === 0) {
      return NextResponse.json({ success: true, count: 0, skipped, importType })
    }

    // Fase 2: BULK con INSERT ... ON CONFLICT (include gen_random_uuid() per la colonna id)
    if (importType === "rep") {
      const values = resolvedOps.map(op => {
        // Il dashboard colora in VIOLA le REP con valore esatto "REP" (maiuscolo)
        // e in ARANCIONE quelle con "rep" (minuscolo, inserite manualmente)
        const repVal = "REP"
        return Prisma.sql`(gen_random_uuid(), ${op.userId}, ${op.date}::timestamp, 'RP', ${repVal})`
      })
      
      await prisma.$executeRaw`
        INSERT INTO "Shift" ("id", "userId", "date", "type", "repType")
        VALUES ${Prisma.join(values)}
        ON CONFLICT ("userId", "date") 
        DO UPDATE SET "repType" = EXCLUDED."repType"
      `
    } else {
      const values = resolvedOps.map(op => 
        Prisma.sql`(gen_random_uuid(), ${op.userId}, ${op.date}::timestamp, ${op.type})`
      )

      await prisma.$executeRaw`
        INSERT INTO "Shift" ("id", "userId", "date", "type")
        VALUES ${Prisma.join(values)}
        ON CONFLICT ("userId", "date") 
        DO UPDATE SET "type" = EXCLUDED."type"
      `
    }

    return NextResponse.json({ 
      success: true, 
      count: resolvedOps.length, 
      skipped,
      importType,
      message: `Importati ${resolvedOps.length} record in blocco (${skipped} ignorati).` 
    })
  } catch (error) {
    console.error("[SHIFTS IMPORT]", error)
    return NextResponse.json({ error: "Errore interno durante l'importazione" }, { status: 500 })
  }
}
