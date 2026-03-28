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
    const { shifts }: { shifts: any[] } = await req.json()

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

    // 4. Prepare data for batch processing
    // We will delete existing shifts for the target period for the agents in the file to avoid conflicts
    const userIds = Array.from(agentMap.values()).map(info => {
      return info.matricola ? userByMatricola.get(info.matricola) : userByName.get(info.name.toUpperCase())
    }).filter(Boolean) as string[]

    const dates = Array.from(new Set(shifts.map((s: any) => new Date(s.date).toISOString())))
    const minDate = new Date(Math.min(...dates.map(d => new Date(d).getTime())))
    const maxDate = new Date(Math.max(...dates.map(d => new Date(d).getTime())))

    // Delete existing records for these users in this range to avoid "unique constraint" errors on re-upload
    await prisma.shift.deleteMany({
      where: {
        userId: { in: userIds },
        date: { gte: minDate, lte: maxDate }
      }
    })

    // 5. Batch Insert
    const dataToInsert = shifts.map((s: any) => {
      const userId = s.matricola ? userByMatricola.get(s.matricola?.toString()) : userByName.get(s.name?.toString().toUpperCase().trim())
      if (!userId) return null

      const typeRaw = s.type?.toString().trim().toUpperCase() || ""
      const isRCode = typeRaw === "R" || typeRaw === "REP" || typeRaw === "REP 22-07"

      return {
        userId,
        date: new Date(s.date),
        type: isRCode ? "" : s.type?.toString() || "",
        repType: isRCode ? "REP 22-07" : null
      }
    }).filter(Boolean)

    const result = await prisma.shift.createMany({
      data: dataToInsert as any,
      skipDuplicates: true
    })

    return NextResponse.json({ success: true, count: result.count })
  } catch (error) {
    console.error("[SHIFTS API ERROR]", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
