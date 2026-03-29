import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { isHoliday } from "@/utils/holidays"

export async function GET(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const month = parseInt(searchParams.get("month") || "4")
  const year = parseInt(searchParams.get("year") || "2026")

  try {
    const startDate = new Date(Date.UTC(year, month - 1, 1))
    const endDate = new Date(Date.UTC(year, month, 1))

    const shifts = await prisma.shift.findMany({
      where: {
        date: { gte: startDate, lt: endDate },
        repType: { not: null }
      },
      include: {
        user: { select: { name: true, isUfficiale: true } }
      }
    })

    const statsMap: Record<string, any> = {}

    shifts.forEach(s => {
      const d = new Date(s.date)
      const utcDow = d.getUTCDay()
      const name = s.user.name
      
      if (!statsMap[name]) {
        statsMap[name] = { 
          name, 
          sabato: 0, 
          domenica: 0, 
          feriale: 0, 
          infrasettimanale: 0,
          isUff: s.user.isUfficiale 
        }
      }

      const isVigilia = (d.getUTCDate() < 31 && isHoliday(new Date(Date.UTC(year, month - 1, d.getUTCDate() + 1))))
      const festive = isHoliday(d) || isVigilia

      if (utcDow === 6) statsMap[name].sabato++
      else if (utcDow === 0) statsMap[name].domenica++
      else if (festive) statsMap[name].infrasettimanale++
      else statsMap[name].feriale++
    })

    const chartData = Object.values(statsMap)

    return NextResponse.json({ chartData })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
