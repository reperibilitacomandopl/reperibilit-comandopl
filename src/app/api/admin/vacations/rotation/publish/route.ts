import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

const PERIOD_LABELS: Record<string, string> = {
  SUMMER: "Estate ☀️",
  WINTER: "Inverno ❄️"
}

export async function POST(request: Request) {
  const session = await auth()
  const u = session?.user
  if (!u) return NextResponse.json({ error: "Non autenticato" }, { status: 401 })
  if (u.role !== "ADMIN" && !u.canManageUsers) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 })
  }

  try {
    const { year, season } = await request.json()
    if (!year || !season) {
      return NextResponse.json({ error: "year e season obbligatori" }, { status: 400 })
    }

    // 1. Carica tutti i periodi ordinati
    const periods = await prisma.vacationRotationPeriod.findMany({
      where: { tenantId: u.tenantId, season },
      orderBy: { orderIndex: "asc" }
    })

    if (periods.length === 0) {
      return NextResponse.json({ error: "Nessun turno/periodo configurato per questa stagione" }, { status: 400 })
    }

    // 2. Carica tutti i gruppi con i relativi membri
    const groups = await prisma.vacationRotationGroup.findMany({
      where: { tenantId: u.tenantId, season },
      include: { basePeriod: true, members: true }
    })

    const results = []

    for (const group of groups) {
      // Calcola l'indice del periodo attivo per il gruppo in base all'anno
      const yearsDiff = year - group.baseYear
      const baseIndex = periods.findIndex((p: any) => p.id === group.basePeriodId)
      
      if (baseIndex === -1) continue // periodo base non configurato o rimosso

      const activeIndex = (((baseIndex + yearsDiff) % periods.length) + periods.length) % periods.length
      const activePeriod = periods[activeIndex]

      // Costruisci le date reali per il target year
      const startDate = new Date(year, activePeriod.startMonth - 1, activePeriod.startDay)
      const endDate = new Date(year, activePeriod.endMonth - 1, activePeriod.endDay, 23, 59, 59)

      for (const member of group.members) {
        // Upsert il piano ferie ufficiale per il membro
        const plan = await prisma.vacationPlan.upsert({
          where: {
            userId_period_year: {
              userId: member.id,
              period: season,
              year: year
            }
          },
          update: {
            startDate,
            endDate,
            status: "ASSIGNED",
            notes: `Assegnazione automatica tramite rotazione Gruppo: ${group.name}`
          },
          create: {
            tenantId: u.tenantId,
            userId: member.id,
            year: year,
            period: season,
            startDate,
            endDate,
            status: "ASSIGNED",
            notes: `Assegnazione automatica tramite rotazione Gruppo: ${group.name}`
          }
        })

        results.push({ member: member.name, group: group.name, period: activePeriod.name })

        // Invia Notifiche Mobile all'Agente
        try {
          const startStr = startDate.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" })
          const endStr = endDate.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" })
          const seasonLabel = PERIOD_LABELS[season] || season

          const title = `📅 Ferie ${seasonLabel} Assegnate (Rotazione)`
          const body = `Ti è stato assegnato il turno per ${activePeriod.name} (${startStr} - ${endStr}) in base alla rotazione del tuo gruppo.`

          // Push Notification
          try {
            const { sendPushNotification } = await import("@/lib/push-notifications")
            await sendPushNotification(member.id, { title, body, url: "/" })
          } catch (pe) {
            console.error("[PUBLISH_PUSH_ERROR]", pe)
          }

          // Telegram Message
          if (member.telegramChatId && member.telegramOptIn) {
            try {
              const { sendTelegramMessage } = await import("@/lib/telegram")
              await sendTelegramMessage(
                member.telegramChatId,
                `<b>${title.toUpperCase()}</b>\n\nCiao ${member.name.split(" ")[0]},\n${body} 👮‍♂️✈️`
              )
            } catch (te) {
              console.error("[PUBLISH_TELEGRAM_ERROR]", te)
            }
          }
        } catch (ne) {
          console.error("[PUBLISH_NOTIFY_ERROR]", ne)
        }
      }
    }

    return NextResponse.json({ success: true, published: results })
  } catch (error) {
    console.error("[ROTATION_PUBLISH_POST]", error)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}
