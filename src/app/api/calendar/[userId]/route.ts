import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Helper: format a date + hour as ICS local time string (YYYYMMDDTHHMMSS)
function toIcsLocal(year: number, month: number, day: number, hour: number, min = 0) {
  const yy = String(year)
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  const hh = String(hour).padStart(2, '0')
  const mi = String(min).padStart(2, '0')
  return `${yy}${mm}${dd}T${hh}${mi}00`
}

export async function GET(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true }
    })
    
    if (!user) {
      return new NextResponse("User not found", { status: 404 })
    }

    // All REP shifts for this user
    const shifts = await prisma.shift.findMany({
      where: {
        userId,
        repType: { not: null }
      }
    })

    // Only include shifts from published months
    let publishedMonths: any[] = []
    try {
      publishedMonths = await prisma.monthStatus.findMany({
        where: { isPublished: true }
      })
    } catch {
      // If MonthStatus table doesn't exist yet, include all shifts
    }
    
    const pubSet = publishedMonths.length > 0
      ? new Set(publishedMonths.map((m: any) => `${m.year}-${m.month}`))
      : null

    const validShifts = pubSet
      ? shifts.filter(s => {
          const d = new Date(s.date)
          return pubSet.has(`${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`)
        })
      : shifts

    // Build ICS content
    const dtstamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '') // 20260323T180000Z

    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Portale Caserma//Reperibilita//IT',
      'CALSCALE:GREGORIAN',
      `X-WR-CALNAME:Reperibilità - ${user.name}`,
      'X-WR-TIMEZONE:Europe/Rome',
      'X-MICROSOFT-CALSCALE:GREGORIAN',
      // VTIMEZONE block for Europe/Rome
      'BEGIN:VTIMEZONE',
      'TZID:Europe/Rome',
      'BEGIN:STANDARD',
      'DTSTART:19701025T030000',
      'RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=10',
      'TZOFFSETFROM:+0200',
      'TZOFFSETTO:+0100',
      'TZNAME:CET',
      'END:STANDARD',
      'BEGIN:DAYLIGHT',
      'DTSTART:19700329T020000',
      'RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=3',
      'TZOFFSETFROM:+0100',
      'TZOFFSETTO:+0200',
      'TZNAME:CEST',
      'END:DAYLIGHT',
      'END:VTIMEZONE',
    ]

    validShifts.forEach(shift => {
      const d = new Date(shift.date)
      const year = d.getUTCFullYear()
      const month = d.getUTCMonth() + 1 // 1-based
      const day = d.getUTCDate()

      // Default: 22:00 same day → 07:00 next day
      const startH = 22
      const endH = 7

      // Compute next day for end
      const nextDay = new Date(Date.UTC(year, month - 1, day + 1))
      const endYear = nextDay.getUTCFullYear()
      const endMonth = nextDay.getUTCMonth() + 1
      const endDay = nextDay.getUTCDate()

      const dtstart = toIcsLocal(year, month, day, startH)
      const dtend = toIcsLocal(endYear, endMonth, endDay, endH)

      const uid = `rep-${shift.id}@portale-caserma`
      const summary = `🟢 Reperibilità ${shift.repType || 'REP'}`
      const description = `Turno base associato: ${shift.type || 'Nessuno'}\\nOrario: 22:00 - 07:00`

      lines.push('BEGIN:VEVENT')
      lines.push(`UID:${uid}`)
      lines.push(`DTSTAMP:${dtstamp}`)
      lines.push(`DTSTART;TZID=Europe/Rome:${dtstart}`)
      lines.push(`DTEND;TZID=Europe/Rome:${dtend}`)
      lines.push(`SUMMARY:${summary}`)
      lines.push(`DESCRIPTION:${description}`)
      lines.push('STATUS:CONFIRMED')
      lines.push('SEQUENCE:0')
      lines.push('TRANSP:OPAQUE')
      lines.push('BEGIN:VALARM')
      lines.push('TRIGGER:-PT1H')
      lines.push('ACTION:DISPLAY')
      lines.push('DESCRIPTION:Reperibilità tra 1 ora')
      lines.push('END:VALARM')
      lines.push('END:VEVENT')
    })

    lines.push('END:VCALENDAR')

    const icsContent = lines.join('\r\n')

    return new NextResponse(icsContent, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="reperibilita_${user.name.replace(/\s+/g, '_')}.ics"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    })

  } catch (err) {
    console.error(err)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
