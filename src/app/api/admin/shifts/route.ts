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

    // 4. Prepare data for batch processing (Optimized Upsert)
    const upsertPromises: any[] = []

    for (const s of shifts) {
      const userId = s.matricola ? userByMatricola.get(s.matricola?.toString()) : userByName.get(s.name?.toString().toUpperCase().trim())
      if (!userId) continue

      const typeRaw = s.type?.toString().trim().toUpperCase() || ""
      const date = new Date(s.date)

      const updateData: any = {}
      if (importType === "rep") {
        updateData.repType = "REP 22-07"
      } else {
        updateData.type = typeRaw
      }

      const createData = {
        userId,
        date,
        type: importType === "base" ? typeRaw : "",
        repType: importType === "rep" ? "REP 22-07" : null
      }

      upsertPromises.push(
        prisma.shift.upsert({
          where: {
            userId_date: { userId, date }
          },
          update: updateData,
          create: createData
        })
      )
    }

    // Execute in chunks
    const chunkSize = 50
    let totalImported = 0
    for (let i = 0; i < upsertPromises.length; i += chunkSize) {
      const batch = upsertPromises.slice(i, i + chunkSize)
      await Promise.all(batch)
      totalImported += batch.length
    }

    return NextResponse.json({ success: true, count: totalImported })
  } catch (error) {
    console.error("[SHIFTS API ERROR]", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
