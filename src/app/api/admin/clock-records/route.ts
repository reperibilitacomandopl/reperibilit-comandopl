import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && !session?.user?.canVerifyClockIns) 
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const dateStr = searchParams.get("date") // format: YYYY-MM-DD
  const limit = parseInt(searchParams.get("limit") || "200")
  const targetUserId = searchParams.get("userId")

  try {
    const tenantId = session.user.tenantId

    let dateFilter = {}
    if (dateStr) {
        const date = new Date(dateStr)
        const start = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
        const end = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59))
        dateFilter = { timestamp: { gte: start, lte: end } }
    } else if (!targetUserId) {
        // If no user specified and no date, just show today globally
        const now = new Date()
        const start = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
        const end = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59))
        dateFilter = { timestamp: { gte: start, lte: end } }
    }

    const records = await prisma.clockRecord.findMany({
      where: { 
        tenantId: tenantId || null,
        ...(targetUserId ? { userId: targetUserId } : {}),
        ...dateFilter
      },
      orderBy: { timestamp: "desc" },
      take: limit,
      include: {
        user: { select: { name: true, matricola: true, role: true } }
      }
    })

    return NextResponse.json({ records })
  } catch (error) {
    console.error("[ADMIN CLOCK RECORDS GET]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
