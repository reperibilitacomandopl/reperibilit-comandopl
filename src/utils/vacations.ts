import { prisma } from "@/lib/prisma"
import { getEaster } from "./holidays"

// Safe timezone-independent holiday check using UTC Date methods
export function isCalendarHolidayUTC(date: Date): boolean {
  const day = date.getUTCDate()
  const month = date.getUTCMonth() + 1
  const year = date.getUTCFullYear()

  // Fixed holidays in Italy
  const fixed = [
    [1, 1],   // Capodanno
    [1, 6],   // Epifania
    [4, 25],  // Liberazione
    [5, 1],   // Lavoratori
    [5, 5],   // Festa Patronale
    [6, 2],   // Repubblica
    [8, 15],  // Ferragosto
    [11, 1],  // Tutti i Santi
    [12, 8],  // Immacolata
    [12, 25], // Natale
    [12, 26]  // S. Stefano
  ]
  
  if (fixed.some(([m, d]) => m === month && d === day)) {
    return true
  }

  // Easter & Easter Monday
  const easter = getEaster(year)
  const easterDay = easter.getDate()
  const easterMonth = easter.getMonth() + 1
  if (easterDay === day && easterMonth === month) {
    return true
  }

  const easterMonday = new Date(easter.getTime())
  easterMonday.setDate(easter.getDate() + 1)
  if (easterMonday.getDate() === day && easterMonday.getMonth() + 1 === month) {
    return true
  }

  return false
}

export function getVacationShiftType(date: Date): string {
  const day = date.getUTCDay()
  if (day === 0) {
    return "R"
  }
  if (isCalendarHolidayUTC(date)) {
    return "(INFR)"
  }
  return "FERIE"
}

export function getDatesInRange(startDateInput: Date | string, endDateInput: Date | string): Date[] {
  const start = new Date(startDateInput)
  const end = new Date(endDateInput)
  
  const getRomeParts = (d: Date) => {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Rome",
      year: "numeric",
      month: "numeric",
      day: "numeric"
    })
    const parts = formatter.formatToParts(d)
    const year = parseInt(parts.find(p => p.type === "year")!.value, 10)
    const month = parseInt(parts.find(p => p.type === "month")!.value, 10)
    const day = parseInt(parts.find(p => p.type === "day")!.value, 10)
    return { year, month: month - 1, day }
  }
  
  const startParts = getRomeParts(start)
  const endParts = getRomeParts(end)
  
  const startDateUTC = new Date(Date.UTC(startParts.year, startParts.month, startParts.day))
  const endDateUTC = new Date(Date.UTC(endParts.year, endParts.month, endParts.day))
  
  const dates: Date[] = []
  let current = new Date(startDateUTC)
  while (current <= endDateUTC) {
    dates.push(new Date(current))
    current.setUTCDate(current.getUTCDate() + 1)
  }
  return dates
}

export async function getShiftIncludingDeleted(tx: any, tenantId: string, userId: string, date: Date) {
  const rawShifts = await tx.$queryRawUnsafe(
    `SELECT * FROM "Shift" WHERE "tenantId" = $1 AND "userId" = $2 AND date = $3 LIMIT 1`,
    tenantId,
    userId,
    date
  )
  return rawShifts[0] || null
}

export async function syncVacationShifts(tenantId: string, userId: string, startDate: Date | string, endDate: Date | string, status: string) {
  const dates = getDatesInRange(startDate, endDate)
  
  // 1. Pulisci sempre i turni di tipo "FERIE", "R", "(INFR)" nel vecchio/nuovo intervallo per questo utente
  for (const date of dates) {
    const existingShift = await prisma.shift.findFirst({
      where: {
        tenantId,
        userId,
        date
      }
    })
    if (existingShift && (existingShift.type === "FERIE" || existingShift.type === "R" || existingShift.type === "(INFR)")) {
      if (existingShift.serviceDetails || existingShift.repType) {
        await prisma.shift.update({
          where: { id: existingShift.id },
          data: { type: "" }
        })
      } else {
        await prisma.shift.delete({
          where: { id: existingShift.id }
        })
      }
    }
  }
  
  // 2. Se lo stato è CONFIRMED, scrivi i turni con la tipologia corretta
  if (status === "CONFIRMED") {
    const protectedTypes = ["MALATTIA", "MAL", "MALATT", "104", "CONGEDO", "ASPETTATIVA"]
    for (const date of dates) {
      const existingShift = await getShiftIncludingDeleted(prisma, tenantId, userId, date)
      
      const targetType = getVacationShiftType(date)
      
      if (existingShift) {
        if (!protectedTypes.includes(existingShift.type)) {
          await prisma.shift.update({
            where: { id: existingShift.id },
            data: {
              type: targetType,
              deletedAt: null
            }
          })
        }
      } else {
        await prisma.shift.create({
          data: {
            tenantId,
            userId,
            date,
            type: targetType
          }
        })
      }
    }
  }
}


