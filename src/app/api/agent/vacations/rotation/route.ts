import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getEaster } from "@/utils/holidays"

function getMidweekHolidays(year: number): Array<{ name: string; date: Date }> {
  const list: Array<{ name: string; m: number; d: number }> = [
    { name: "Capodanno", m: 1, d: 1 },
    { name: "Epifania", m: 1, d: 6 },
    { name: "Liberazione", m: 4, d: 25 },
    { name: "Festa del Lavoro", m: 5, d: 1 },
    { name: "Festa Patronale", m: 5, d: 5 },
    { name: "Festa della Repubblica", m: 6, d: 2 },
    { name: "Ferragosto", m: 8, d: 15 },
    { name: "Tutti i Santi", m: 11, d: 1 },
    { name: "Immacolata", m: 12, d: 8 },
    { name: "Natale", m: 12, d: 25 },
    { name: "Santo Stefano", m: 12, d: 26 }
  ]

  const holidays: Array<{ name: string; date: Date }> = []

  for (const item of list) {
    const d = new Date(year, item.m - 1, item.d)
    if (d.getDay() !== 0) {
      holidays.push({ name: item.name, date: d })
    }
  }

  const easter = getEaster(year)
  const easterMonday = new Date(easter.getTime())
  easterMonday.setDate(easter.getDate() + 1)
  if (easterMonday.getDay() !== 0) {
    holidays.push({ name: "Lunedì dell'Angelo (Pasquetta)", date: easterMonday })
  }

  return holidays.sort((a, b) => a.date.getTime() - b.date.getTime())
}

export async function GET(request: Request) {
  const session = await auth()
  const u = session?.user
  if (!u) return NextResponse.json({ error: "Non autenticato" }, { status: 401 })

  const currentYear = new Date().getFullYear()
  const years = [currentYear, currentYear + 1, currentYear + 2]

  try {
    const activePlans = await prisma.vacationPlan.findMany({
      where: {
        tenantId: u.tenantId,
        userId: u.id,
        year: { in: years }
      }
    })

    // 1. Carica i gruppi di ferie a cui appartiene l'agente
    const vacationGroups = await prisma.vacationRotationGroup.findMany({
      where: {
        tenantId: u.tenantId,
        members: { some: { id: u.id } }
      },
      include: { basePeriod: true }
    })

    const vacationRotations = []

    for (const group of vacationGroups) {
      // Carica tutti i periodi per la stessa stagione per poter calcolare la rotazione ciclica
      const periods = await prisma.vacationRotationPeriod.findMany({
        where: { tenantId: u.tenantId, season: group.season },
        orderBy: { orderIndex: "asc" }
      })

      if (periods.length === 0) continue

      const baseIndex = periods.findIndex((p: any) => p.id === group.basePeriodId)
      if (baseIndex === -1) continue

      const schedule = years.map(yr => {
        const yearsDiff = yr - group.baseYear
        const activeIndex = (((baseIndex + yearsDiff) % periods.length) + periods.length) % periods.length
        const period = periods[activeIndex]

        const startStr = `${String(period.startDay).padStart(2, '0')}/${String(period.startMonth).padStart(2, '0')}`
        const endStr = `${String(period.endDay).padStart(2, '0')}/${String(period.endMonth).padStart(2, '0')}`

        return {
          year: yr,
          periodName: period.name,
          dates: `${startStr} - ${endStr}`
        }
      })

      vacationRotations.push({
        season: group.season,
        groupName: group.name,
        schedule
      })
    }

    // 2. Carica i gruppi di festivi infrasettimanali a cui appartiene l'agente
    const holidayGroups = await prisma.holidayRotationGroup.findMany({
      where: {
        tenantId: u.tenantId,
        members: { some: { id: u.id } }
      }
    })

    const holidayRotations = []

    // Carica tutti i gruppi per calcolare la rotazione
    const allHolidayGroups = await prisma.holidayRotationGroup.findMany({
      where: { tenantId: u.tenantId },
      orderBy: { orderIndex: "asc" }
    })

    if (allHolidayGroups.length > 0) {
      for (const group of holidayGroups) {
        const schedule = [currentYear, currentYear + 1].map(yr => {
          const holidays = getMidweekHolidays(yr)
          const baseYear = allHolidayGroups[0].baseYear || 2026
          const yearsDiff = yr - baseYear

          const assignedHolidays = []

          for (let i = 0; i < holidays.length; i++) {
            const assignedGroupIndex = (((i + yearsDiff) % allHolidayGroups.length) + allHolidayGroups.length) % allHolidayGroups.length
            const assignedGroup = allHolidayGroups[assignedGroupIndex]

            if (assignedGroup.id === group.id) {
              assignedHolidays.push({
                name: holidays[i].name,
                date: holidays[i].date.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" })
              })
            }
          }

          return {
            year: yr,
            holidays: assignedHolidays
          }
        })

        holidayRotations.push({
          groupName: group.name,
          schedule
        })
      }
    }

    return NextResponse.json({
      success: true,
      vacations: vacationRotations,
      holidays: holidayRotations,
      activePlans
    })
  } catch (error) {
    console.error("[AGENT_ROTATION_GET]", error)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await auth()
  const u = session?.user
  if (!u) return NextResponse.json({ error: "Non autenticato" }, { status: 401 })

  try {
    const { planId, action } = await request.json()
    if (!planId || !action) {
      return NextResponse.json({ error: "planId e action obbligatori" }, { status: 400 })
    }

    const plan = await prisma.vacationPlan.findFirst({
      where: { id: planId, userId: u.id, tenantId: u.tenantId }
    })

    if (!plan) {
      return NextResponse.json({ error: "Piano ferie non trovato" }, { status: 404 })
    }

    if (action === "ACCEPT") {
      // Aggiorna lo stato a CONFIRMED
      const updatedPlan = await prisma.vacationPlan.update({
        where: { id: planId },
        data: { status: "CONFIRMED" }
      })

      // Sincronizza i turni (scrive "FERIE" nel calendario)
      const { syncVacationShifts } = await import("@/utils/vacations")
      await syncVacationShifts(u.tenantId || "", u.id, plan.startDate, plan.endDate, "CONFIRMED")

      // Notifica il comandante o crea una notifica
      try {
        const admins = await prisma.user.findMany({
          where: { tenantId: u.tenantId, role: "ADMIN" }
        })
        const { sendPushNotification } = await import("@/lib/push-notifications")
        for (const adminUser of admins) {
          await sendPushNotification(adminUser.id, {
            title: "✔️ Ferie Rotazione Accettate",
            body: `L'agente ${u.name} ha accettato le ferie di rotazione per ${plan.period} (${plan.startDate.toLocaleDateString('it-IT')} - ${plan.endDate.toLocaleDateString('it-IT')}).`,
            url: "/admin/ferie"
          })
        }
      } catch (ne) {
        console.error("[AGENT_VACATION_ACCEPT_NOTIFY_ERROR]", ne)
      }

      return NextResponse.json({ success: true, plan: updatedPlan })
    }

    return NextResponse.json({ error: "Azione non supportata" }, { status: 400 })
  } catch (error) {
    console.error("[AGENT_ROTATION_POST]", error)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}
