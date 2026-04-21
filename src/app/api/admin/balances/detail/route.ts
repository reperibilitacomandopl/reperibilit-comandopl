import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && !session?.user?.canManageShifts) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString())
  const userId = searchParams.get("userId")

  if (!userId) {
     return NextResponse.json({ error: "Missing userId parameter" }, { status: 400 })
  }

  try {
    const tenantId = session.user.tenantId
    const tf = tenantId ? { tenantId } : {}

    const startDate = new Date(Date.UTC(year, 0, 1))
    const endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59))
    
    // Raw data for monthly breakdown on client-side for a SINGLE user
    const monthlyShifts = await prisma.shift.findMany({
      where: { userId, date: { gte: startDate, lte: endDate }, ...tf },
      select: { type: true, date: true }
    })

    const monthlyAgenda = await prisma.agendaEntry.findMany({
      where: { userId, date: { gte: startDate, lte: endDate }, ...tf },
      select: { code: true, date: true, hours: true }
    })

    return NextResponse.json({ 
      monthlyShifts, 
      monthlyAgenda
    })
  } catch (error) {
    console.error("[BALANCES DETAIL GET]", error)
    return NextResponse.json({ error: "Errore caricamento dettagli mensili" }, { status: 500 })
  }
}
