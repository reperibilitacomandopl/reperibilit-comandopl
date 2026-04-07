// @ts-nocheck
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import bcrypt from "bcryptjs"

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { shifts, importType } = await req.json()

    if (!shifts || !Array.isArray(shifts) || shifts.length === 0) {
      return NextResponse.json({ error: "Nessun turno da importare" }, { status: 400 })
    }

    const tenantId = session.user.tenantId
    const defaultPass = await bcrypt.hash("Cambiami2026!", 10)

    // 1. Carica categorie per la mappatura automatica Squadra -> Sezione
    const categories = await prisma.serviceCategory.findMany({
      where: { tenantId },
      include: { types: true }
    })

    // 2. Pre-carica gli utenti esistenti
    const allUsers = await prisma.user.findMany({
      where: { role: "AGENTE", tenantId: tenantId || null },
      select: { id: true, name: true, matricola: true }
    })

    const matricolaMap = new Map()
    const nameMap = new Map()
    allUsers.forEach(u => {
      if (u.matricola) matricolaMap.set(u.matricola, u.id)
      nameMap.set(u.name.toUpperCase().trim(), u.id)
    })

    const resolvedOps = []
    let createdUsersCount = 0
    let skipped = 0

    // 3. Elaborazione turni e anagrafica
    for (const entry of shifts) {
      const { name, matricola, qualifica, squadra, date, type } = entry
      if (!date || !type) continue

      let userId = matricola ? matricolaMap.get(matricola) : null
      if (!userId && name) {
        userId = nameMap.get(name.toUpperCase().trim())
      }

      // AUTO-CREAZIONE AGENTE SE MANCANTE (Con Grado e Squadra)
      if (!userId && name) {
        try {
          const qual = (qualifica || "").toUpperCase()
          const squad = (squadra || "").toUpperCase()
          
          // Rilevamento Ufficiale (Grado o Squadra "Ufficiali")
          const isUff = squad.includes("UFFICIALI") || 
                        qual.includes("COMMISSARIO") || 
                        qual.includes("ISPETTORE") || 
                        qual.includes("DIRIGENTE") || 
                        qual.includes("COMANDANTE") ||
                        qual.includes("TENENTE") ||
                        qual.includes("CAPITANO")

          // Mappatura automatica Categoria ODS (Squadra -> Categoria)
          let defaultCatId = null
          let defaultTypeId = null
          
          const matchedCat = categories.find(c => {
            const cName = c.name.toUpperCase()
            // Semplificazione: rimuoviamo prefissi comuni per il matching
            const sClean = squad.replace("POLIZIA ", "").replace("PRONTO ", "").replace("UFFICIO ", "").trim()
            return squad.includes(cName) || cName.includes(sClean)
          })
          
          if (matchedCat) {
            defaultCatId = matchedCat.id
            if (matchedCat.types.length > 0) defaultTypeId = matchedCat.types[0].id
          }

          const newUser = await prisma.user.create({
            data: {
              name: name.toUpperCase().trim(),
              matricola: matricola || `NEW-${Math.random().toString(36).substr(2, 5)}`,
              password: defaultPass,
              role: "AGENTE",
              tenantId: tenantId || null,
              qualifica: qualifica || null,
              servizio: squadra || null,
              isUfficiale: isUff,
              defaultServiceCategoryId: defaultCatId,
              defaultServiceTypeId: defaultTypeId,
              forcePasswordChange: true
            }
          })
          userId = newUser.id
          nameMap.set(newUser.name, userId)
          createdUsersCount++
        } catch (e) {
          console.error("Errore autocreazione:", e); skipped++; continue
        }
      }

      if (!userId) { skipped++; continue }

      const targetDate = new Date(date)
      targetDate.setUTCHours(0, 0, 0, 0)
      resolvedOps.push({ userId, date: targetDate, type: type.toString().trim() })
    }

    if (resolvedOps.length === 0) {
      return NextResponse.json({ success: true, count: 0, skipped, importType, createdUsersCount })
    }

    // 4. Inserimento Bulk con INSERT ... ON CONFLICT
    if (importType === "rep") {
      const values = resolvedOps.map(op => Prisma.sql`(gen_random_uuid(), ${op.userId}, ${op.date}::timestamp, 'RP', 'REP', ${tenantId || null})`)
      await prisma.$executeRaw`INSERT INTO "Shift" ("id", "userId", "date", "type", "repType", "tenantId") VALUES ${Prisma.join(values)} ON CONFLICT ("userId", "date", "tenantId") DO UPDATE SET "repType" = EXCLUDED."repType"`
    } else {
      const values = resolvedOps.map(op => Prisma.sql`(gen_random_uuid(), ${op.userId}, ${op.date}::timestamp, ${op.type}, ${tenantId || null})`)
      await prisma.$executeRaw`INSERT INTO "Shift" ("id", "userId", "date", "type", "tenantId") VALUES ${Prisma.join(values)} ON CONFLICT ("userId", "date", "tenantId") DO UPDATE SET "type" = EXCLUDED."type"`
    }

    // --- NOTIFICA PER L'ADMIN CHE HA ESEGUITO L'IMPORT ---
    try {
      await (prisma as any).notification.create({
        data: {
          tenantId: tenantId || null,
          userId: session.user.id,
          title: "Importazione Completata",
          message: `Caricati con successo ${resolvedOps.length} record. ${createdUsersCount > 0 ? `Creati ${createdUsersCount} nuovi agenti.` : ''}`,
          type: "SUCCESS",
          link: "/admin/risorse"
        }
      })
    } catch (notifyError) {
      console.error("Error creating import notification:", notifyError)
    }

    return NextResponse.json({ 
      success: true, 
      count: resolvedOps.length, 
      createdUsersCount,
      message: `Importati ${resolvedOps.length} record. Creati ${createdUsersCount} utenti con Grado e Sezione mappati correttamente.` 
    })
  } catch (error) {
    console.error("[SHIFTS IMPORT]", error)
    return NextResponse.json({ error: "Errore interno caricamento" }, { status: 500 })
  }
}
