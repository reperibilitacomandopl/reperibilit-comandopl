import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import crypto from "crypto"

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && !session?.user?.canManageShifts) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { shifts, importType }: { shifts: any[], importType: "base" | "rep" } = await req.json()

    // 1. Group shifts and identify unique agents (by matricola preferably, fallback to name)
    const agentMap = new Map<string, { name: string, matricola: string }>()
    for (const s of shifts) {
      const key = s.matricola?.toString() || s.name?.toString().toUpperCase().trim()
      if (key && !agentMap.has(key)) {
        agentMap.set(key, { name: s.name, matricola: s.matricola?.toString() || "" })
      }
    }

    const tenantId = session.user.tenantId
    if (!tenantId) {
      return NextResponse.json({ error: "Fail-Safe: Impossibile importare turni senza un comando specifico attivo." }, { status: 400 })
    }

    // 2. Load all existing users for mapping
    const existingUsers = await prisma.user.findMany({ where: { tenantId } })
    const userByMatricola = new Map(existingUsers.map((u: any) => [u.matricola, u.id]))
    const userByName = new Map(existingUsers.map((u: any) => [u.name.toUpperCase(), u.id]))

    // 3. Ensure all agents exist
    // C7 FIX: Generare password random sicura anziché hardcoded
    const randomPassword = crypto.randomBytes(16).toString("base64url")
    const defaultHashedPassword = await bcrypt.hash(randomPassword, 12)
    for (const [key, info] of agentMap.entries()) {
      let userId = info.matricola ? userByMatricola.get(info.matricola) : userByName.get(info.name.toUpperCase())
      
      if (!userId) {
        // Create missing agent
        const newMatricola = info.matricola || (info.name.replace(/[^A-Z]/g, '').substring(0, 6) + Math.floor(Math.random() * 1000).toString().padStart(3, '0'))
        const newUser = await prisma.user.create({
          data: {
            tenantId: tenantId || null,
            name: info.name,
            matricola: newMatricola,
            password: defaultHashedPassword,
            role: "AGENTE",
            forcePasswordChange: true,
            isUfficiale: false
          }
        })
        userId = newUser.id
        userByMatricola.set(newMatricola, userId)
        userByName.set(info.name.toUpperCase(), userId)
      }
    }

    // 4. Prepare data for bulk upsert
    // Constructing a single SQL query for maximum performance on PostgreSQL
    // To handle R and RR specifically as base shifts
    
    const chunkSize = 200
    let totalImported = 0

    for (let i = 0; i < shifts.length; i += chunkSize) {
      const chunk = shifts.slice(i, i + chunkSize)
      
      // Building the VALUES part of the SQL query
      // Format: ('ID', 'USERID', 'DATE', 'TYPE', 'REPTYPE', 'CREATEDAT')
      const upsertOperations = []
      
      for (const s of chunk) {
        const userId = s.matricola ? userByMatricola.get(s.matricola?.toString()) : userByName.get(s.name?.toString().toUpperCase().trim())
        if (!userId) continue

        const typeRaw = s.type?.toString().trim().toUpperCase() || ""
        const dateObj = new Date(s.date)

        if (importType === "rep") {
          upsertOperations.push(prisma.shift.upsert({
            where: {
              userId_date_tenantId: {
                userId,
                date: dateObj,
                tenantId: tenantId || ""
              }
            },
            update: { repType: 'REP' },
            create: {
              userId,
              date: dateObj,
              type: '',
              repType: 'REP',
              tenantId
            }
          }))
        } else {
          upsertOperations.push(prisma.shift.upsert({
            where: {
              userId_date_tenantId: {
                userId,
                date: dateObj,
                tenantId: tenantId || ""
              }
            },
            update: { type: typeRaw },
            create: {
              userId,
              date: dateObj,
              type: typeRaw,
              tenantId
            }
          }))
        }
      }

      if (upsertOperations.length === 0) continue

      await prisma.$transaction(upsertOperations)
      totalImported += upsertOperations.length
    }

    // Log the bulk action
    await prisma.auditLog.create({
      data: {
        tenantId: tenantId || null,
        adminId: session.user.id!,
        adminName: session.user.name!,
        action: "BULK_IMPORT_SHIFTS",
        details: `Importazione massiva completata (${importType === "base" ? "Turni Base" : "Reperibilità"}). Record interessati: ${totalImported}`
      }
    })

    return NextResponse.json({ success: true, count: totalImported, importType })
  } catch (error) {
    console.error("[SHIFTS API ERROR]", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
