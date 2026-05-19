import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { syncVacationShifts } from "@/utils/vacations"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString())

  try {
    const plans = await prisma.vacationPlan.findMany({
      where: { tenantId: session.user.tenantId, year },
      include: { user: { select: { id: true, name: true, matricola: true, squadra: true } } },
      orderBy: [{ period: "asc" }, { startDate: "asc" }]
    })

    // Raggruppa per periodo
    const grouped = { SUMMER: [] as any[], WINTER: [] as any[], EASTER: [] as any[], CHRISTMAS: [] as any[] }
    for (const p of plans) {
      if (grouped[p.period as keyof typeof grouped]) {
        grouped[p.period as keyof typeof grouped].push(p)
      }
    }

    return NextResponse.json({ plans, grouped })
  } catch (error) {
    console.error("[VACATIONS_GET]", error)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}

const PERIOD_LABELS: Record<string, string> = {
  SUMMER: "Estate ☀️",
  WINTER: "Inverno ❄️",
  EASTER: "Pasqua 🐣",
  CHRISTMAS: "Natale 🎄"
}

export async function POST(request: Request) {
  const session = await auth()
  const u = session?.user

  // Agenti possono solo creare preferenze, admin possono assegnare
  if (!u) return NextResponse.json({ error: "Non autenticato" }, { status: 401 })

  try {
    const { period, startDate, endDate, notes, userId, status } = await request.json()

    if (!period || !startDate || !endDate) {
      return NextResponse.json({ error: "period, startDate e endDate obbligatori" }, { status: 400 })
    }

    const targetUserId = (u.role === "ADMIN" || u.canManageUsers) ? (userId || u.id) : u.id
    const planStatus = (u.role === "ADMIN" || u.canManageUsers) ? (status || "ASSIGNED") : "PREFERENCE"

    const year = new Date(startDate).getFullYear()

    // 1. Trova se esiste già un piano registrato (per ripulire eventuali date vecchie)
    const existingPlan = await prisma.vacationPlan.findUnique({
      where: {
        userId_period_year: {
          userId: targetUserId,
          period,
          year
        }
      }
    })

    if (existingPlan) {
      // Pulisci i vecchi turni indipendentemente dallo stato precedente
      try {
        await syncVacationShifts(u.tenantId || "", targetUserId, existingPlan.startDate, existingPlan.endDate, "CLEANUP")
      } catch (syncErr) {
        console.error("[MANUAL_VACATION_CLEANUP_SYNC_ERROR]", syncErr)
      }
    }

    const plan = await prisma.vacationPlan.upsert({
      where: {
        userId_period_year: {
          userId: targetUserId,
          period,
          year
        }
      },
      update: { startDate: new Date(startDate), endDate: new Date(endDate), notes, status: planStatus },
      create: {
        tenantId: u.tenantId,
        userId: targetUserId,
        year,
        period,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        notes,
        status: planStatus
      }
    })

    // Sincronizzazione automatica nella tabella Shift come turni di tipo "FERIE" (solo se CONFIRMED)
    try {
      await syncVacationShifts(u.tenantId || "", targetUserId, startDate, endDate, planStatus)
    } catch (syncErr) {
      console.error("[MANUAL_VACATION_SHIFT_SYNC_ERROR]", syncErr)
    }

    // --- NOTIFICA AUTOMATICA SUL CELLULARE DELL'AGENTE ---
    try {
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { name: true, telegramChatId: true, telegramOptIn: true }
      })

      if (targetUser) {
        const startStr = new Date(startDate).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
        const endStr = new Date(endDate).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
        const periodLabel = PERIOD_LABELS[period] || period

        let title = ""
        let body = ""

        if (planStatus === "CONFIRMED") {
          title = "🎉 Ferie Confermate dal Comando!"
          body = `Il tuo periodo di ferie per ${periodLabel} (${startStr} - ${endStr}) è stato CONFERMATO dal Comando.`
        } else if (planStatus === "ASSIGNED") {
          title = "📅 Nuovo Piano Ferie Assegnato"
          body = `Ti è stato assegnato il periodo di ferie per ${periodLabel} dal ${startStr} al ${endStr}.`
        } else {
          title = "📝 Preferenza Ferie Registrata"
          body = `La tua preferenza di ferie per ${periodLabel} (${startStr} - ${endStr}) è stata registrata.`
        }

        // 1. Invia Push PWA
        try {
          const { sendPushNotification } = await import("@/lib/push-notifications")
          await sendPushNotification(targetUserId, {
            title,
            body,
            url: "/"
          })
        } catch (pe) {
          console.error("[VACATIONS_PUSH_ERROR]", pe)
        }

        // 2. Invia Telegram
        if (targetUser.telegramChatId && targetUser.telegramOptIn) {
          try {
            const { sendTelegramMessage } = await import("@/lib/telegram")
            await sendTelegramMessage(
              targetUser.telegramChatId,
              `<b>${title.toUpperCase()}</b>\n\nCiao ${targetUser.name.split(' ')[0]},\n${body} 👮‍♂️✈️`
            )
          } catch (te) {
            console.error("[VACATIONS_TELEGRAM_ERROR]", te)
          }
        }
      }
    } catch (ne) {
      console.error("[VACATION_NOTIFY_ERROR]", ne)
    }

    return NextResponse.json({ success: true, plan })
  } catch (error) {
    console.error("[VACATIONS_POST]", error)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id obbligatorio" }, { status: 400 })

  try {
    // Recupera il plan prima di eliminarlo per poter notificare e pulire i turni
    const plan = await prisma.vacationPlan.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, telegramChatId: true, telegramOptIn: true } } }
    })

    if (!plan) {
      return NextResponse.json({ error: "Piano non trovato" }, { status: 444 })
    }

    // Pulisci i turni legati a questo piano
    try {
      await syncVacationShifts(session.user.tenantId || "", plan.userId, plan.startDate, plan.endDate, "CLEANUP")
    } catch (syncErr) {
      console.error("[MANUAL_VACATION_DELETE_SYNC_ERROR]", syncErr)
    }

    await prisma.vacationPlan.delete({ where: { id } })

    if (plan && plan.user) {
      const startStr = new Date(plan.startDate).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
      const endStr = new Date(plan.endDate).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
      const periodLabel = PERIOD_LABELS[plan.period] || plan.period

      const title = "❌ Periodo Ferie Annullato"
      const body = `Il periodo di ferie per ${periodLabel} (${startStr} - ${endStr}) è stato rimosso o annullato.`

      try {
        const { sendPushNotification } = await import("@/lib/push-notifications")
        await sendPushNotification(plan.user.id, { title, body, url: "/" })
      } catch {}

      if (plan.user.telegramChatId && plan.user.telegramOptIn) {
        try {
          const { sendTelegramMessage } = await import("@/lib/telegram")
          await sendTelegramMessage(
            plan.user.telegramChatId,
            `<b>${title.toUpperCase()}</b>\n\nCiao ${plan.user.name.split(' ')[0]},\n${body} 👮‍♂️`
          )
        } catch {}
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[VACATIONS_DELETE]", error)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}
