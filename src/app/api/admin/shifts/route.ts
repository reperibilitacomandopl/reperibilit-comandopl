import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") {
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

    // 2. Load all existing users for mapping
    const existingUsers = await prisma.user.findMany()
    const userByMatricola = new Map(existingUsers.map(u => [u.matricola, u.id]))
    const userByName = new Map(existingUsers.map(u => [u.name.toUpperCase(), u.id]))

    // 3. Ensure all agents exist
    const defaultHashedPassword = await bcrypt.hash("password123", 10)
    for (const [key, info] of agentMap.entries()) {
      let userId = info.matricola ? userByMatricola.get(info.matricola) : userByName.get(info.name.toUpperCase())
      
      if (!userId) {
        // Create missing agent
        const newMatricola = info.matricola || (info.name.replace(/[^A-Z]/g, '').substring(0, 6) + Math.floor(Math.random() * 1000).toString().padStart(3, '0'))
        const newUser = await prisma.user.create({
          data: {
            name: info.name,
            matricola: newMatricola,
            password: defaultHashedPassword,
            role: "AGENTE",
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
      const valueLines: string[] = []
      
      for (const s of chunk) {
        const userId = s.matricola ? userByMatricola.get(s.matricola?.toString()) : userByName.get(s.name?.toString().toUpperCase().trim())
        if (!userId) continue

        const typeRaw = s.type?.toString().trim().toUpperCase().replace(/'/g, "''") || ""
        const dateStr = new Date(s.date).toISOString()
        const id = crypto.randomUUID()
        const now = new Date().toISOString()

        if (importType === "rep") {
          // Si sta caricando la reperibilità: R diventa REP (Maiuscolo = Viola)
          valueLines.push(`('${id}', '${userId}', '${dateStr}', '', 'REP', '${now}')`)
        } else {
          // Si sta caricando la programmazione: R e RR sono turni base
          valueLines.push(`('${id}', '${userId}', '${dateStr}', '${typeRaw}', NULL, '${now}')`)
        }
      }

      if (valueLines.length === 0) continue

      const updateExpression = importType === "rep" 
        ? `"repType" = EXCLUDED."repType"`
        : `"type" = EXCLUDED."type"`

      // Executing raw SQL for maximum speed
      // We use ON CONFLICT because userId+date is unique
      const sql = `
        INSERT INTO "Shift" ("id", "userId", "date", "type", "repType", "createdAt")
        VALUES ${valueLines.join(", ")}
        ON CONFLICT ("userId", "date")
        DO UPDATE SET ${updateExpression};
      `

      await prisma.$executeRawUnsafe(sql)
      totalImported += valueLines.length
    }

    return NextResponse.json({ success: true, count: totalImported })
  } catch (error) {
    console.error("[SHIFTS API ERROR]", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
