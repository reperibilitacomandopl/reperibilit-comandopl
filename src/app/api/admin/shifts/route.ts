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
    const { shifts } = await req.json()

    // 1. Extract unique agent names from the Excel file
    const uniqueNames = Array.from(
      new Set(shifts.map((s: { name: string }) => s.name?.toString().toUpperCase().trim()).filter(Boolean))
    ) as string[]

    // 2. Find which agents already exist in the DB
    const existingUsers = await prisma.user.findMany()
    const existingNames = new Set(existingUsers.map(u => u.name))

    // 3. Auto-create missing agents
    const usersToCreate = uniqueNames.filter(name => !existingNames.has(name))
    
    // Default hashed password for new agents
    const defaultHashedPassword = await bcrypt.hash("password123", 10)

    for (let i = 0; i < usersToCreate.length; i++) {
      const name = usersToCreate[i]
      // Generate a unique matricola using name + index
      const matricola = name.replace(/[^A-Z]/g, '').substring(0, 6) + String(i).padStart(3, '0')
      
      await prisma.user.create({
        data: {
          name,
          matricola,
          password: defaultHashedPassword,
          role: "AGENTE",
          isUfficiale: false
        }
      })
    }

    // 4. Reload all users to build the lookup map
    const allUsers = await prisma.user.findMany()
    const userMap = new Map(allUsers.map(u => [u.name, u.id]))

    // 5. Insert shifts one by one to avoid transaction size limits
    let count = 0
    for (const s of shifts) {
      const userId = userMap.get(s.name?.toString().toUpperCase().trim())
      if (!userId) continue

      const isRep = typeof s.type === 'string' && s.type.trim().toUpperCase() === "REP"

      const updateData: any = {}
      const createData: any = { userId, date: new Date(s.date) }

      if (isRep) {
        updateData.repType = "REP"
        createData.repType = "REP"
      } else {
        updateData.type = s.type
        createData.type = s.type
      }

      await prisma.shift.upsert({
        where: {
          userId_date: {
            userId,
            date: new Date(s.date)
          }
        },
        update: updateData,
        create: createData
      })
      count++
    }

    return NextResponse.json({ success: true, count })
  } catch (error) {
    console.error("[SHIFTS API ERROR]", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
