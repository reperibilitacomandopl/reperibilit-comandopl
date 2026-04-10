// @ts-nocheck
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session || !session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    
    // Get year from query params or current year
    const url = new URL(req.url)
    const yearStr = url.searchParams.get("year")
    const year = yearStr ? parseInt(yearStr) : new Date().getFullYear()

    // 1. Fetch user to get qualifica
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, matricola: true, qualifica: true, ruoloInSquadra: true }
    })

    // 2. Fetch AgentBalance with all details
    const balance = await prisma.agentBalance.findUnique({
      where: {
        userId_year: {
          userId: session.user.id,
          year: year
        }
      },
      include: { details: true }
    })

    if (!balance) {
      return NextResponse.json({ year, user, details: [] })
    }

    // 3. Pre-calculate usage for all codes in this year
    const startOfYear = new Date(Date.UTC(year, 0, 1))
    const endOfYear = new Date(Date.UTC(year, 11, 31, 23, 59, 59))

    // Count shifts (DAYS)
    const shiftsCount = await prisma.shift.groupBy({
      by: ['type'],
      where: { 
        userId: session.user.id,
        date: { gte: startOfYear, lte: endOfYear } 
      },
      _count: { _all: true }
    })

    // Sum agenda entry hours (HOURS)
    const agendaSums = await prisma.agendaEntry.groupBy({
      by: ['code'],
      where: { 
        userId: session.user.id,
        date: { gte: startOfYear, lte: endOfYear } 
      },
      _sum: { hours: true }
    })

    // 4. Map each detail to its usage
    const enrichedDetails = balance.details.map(d => {
      let used = 0
      if (d.unit === "HOURS") {
        used = agendaSums.find(a => a.code === d.code)?._sum.hours || 0
      } else {
        // unit === "DAYS"
        used = shiftsCount.find(s => s.type === d.code)?._count._all || 0
        // Special case: if code is 0015 (Ferie) or 0016 (Ferie AP), we might want to check both? 
        // No, typically let's keep it strict by code for now.
      }

      return {
        ...d,
        used,
        residue: Math.max(0, d.initialValue - used)
      }
    })

    return NextResponse.json({ 
       year,
       user,
       details: enrichedDetails,
       // Legacy fields for backward compatibility (optional but safer)
       balance: {
         ferieTotali: enrichedDetails.find(d => d.code === "0015")?.initialValue || 28,
         ferieUsate: enrichedDetails.find(d => d.code === "0015")?.used || 0,
         ferieResidue: enrichedDetails.find(d => d.code === "0015")?.residue || 28,
         // ... etc
       }
    })

  } catch (err: any) {
    console.error("[BALANCE_API_ERROR]", {
      message: err.message,
      stack: err.stack,
      userId: session?.user?.id
    })
    return NextResponse.json({ error: "Internal Error", details: err.message }, { status: 500 })
  }
}
