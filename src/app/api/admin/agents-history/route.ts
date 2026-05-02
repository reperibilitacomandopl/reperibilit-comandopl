import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user || !session.user.isSuperAdmin) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")

    if (!userId) return NextResponse.json({ error: "UserID mancante" }, { status: 400 })

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const history = await prisma.locationHistory.findMany({
      where: {
        userId,
        tenantId: session.user.tenantId,
        timestamp: { gte: twentyFourHoursAgo }
      },
      orderBy: { timestamp: 'asc' }
    })

    return NextResponse.json({ success: true, history })
  } catch (error) {
    console.error("[AGENTS_HISTORY_ERROR]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
