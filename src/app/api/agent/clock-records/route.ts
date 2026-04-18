import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get("limit") || "100")
  const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString())
  const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString())

  try {
    const tenantId = session.user.tenantId
    const userId = session.user.id

    // Restrict date range if specified, otherwise just get recent
    let dateFilter = {}
    if (searchParams.get("year") && searchParams.get("month")) {
        const start = new Date(Date.UTC(year, month - 1, 1))
        const end = new Date(Date.UTC(year, month, 0, 23, 59, 59))
        dateFilter = { timestamp: { gte: start, lte: end } }
    }

    const records = await prisma.clockRecord.findMany({
      where: { 
        userId,
        tenantId: tenantId || null,
        ...dateFilter
      },
      orderBy: { timestamp: "desc" },
      take: limit
    })

    return NextResponse.json({ records })
  } catch (error) {
    console.error("[AGENT CLOCK RECORDS GET]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
