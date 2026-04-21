import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit"
import { sendTelegramMessage } from "@/lib/telegram"
import { sendPushNotification } from "@/lib/push-notifications"

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && !session?.user?.canManageShifts) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const tenantId = session.user.tenantId
    const { month, year, isPublished, isLocked } = await req.json()
    
    const result = await prisma.monthStatus.upsert({
      where: {
        month_year_tenantId: { month, year, tenantId: tenantId || "" }
      },
      update: {
        ...(isPublished !== undefined && { isPublished }),
        ...(isLocked !== undefined && { isLocked })
      },
      create: {
        month: month,
        year: year,
        isPublished: isPublished ?? false,
        isLocked: isLocked ?? false,
        tenantId: tenantId || null
      }
    })

    if (isPublished !== undefined) {
      await logAudit({
        tenantId: tenantId || null,
        adminId: session.user.id!,
        adminName: session.user.name!,
        action: isPublished ? "PUBLISH_MONTH" : "UNPUBLISH_MONTH",
        details: `${isPublished ? 'Pubblicati' : 'Ritirati'} turni per il periodo ${month}/${year}`
      })
    }

    if (isLocked !== undefined) {
      await logAudit({
        tenantId: tenantId || null,
        adminId: session.user.id!,
        adminName: session.user.name!,
        action: isLocked ? "LOCK_MONTH" : "UNLOCK_MONTH",
        details: `${isLocked ? 'Congelati' : 'Sbloccati'} dati per il periodo ${month}/${year}`
      })
    }
    // NOTIFICA BROADCAST TELEGRAM
    if (isPublished) {
      const monthNames = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"]
      const monthName = monthNames[month - 1] || month
      
      const allAgents = await prisma.user.findMany({
        where: { tenantId: tenantId || null, isActive: true },
        select: { id: true, telegramChatId: true, name: true }
      })

      const text = `📢 <b>PIANIFICAZIONE PUBBLICATA</b>\n\nAttenzione, i turni per il mese di <b>${monthName} ${year}</b> sono stati pubblicati ufficialmente.\n\nControlla ora il tuo pannello agente per visualizzare i dettagli.`

      // Invio asincrono a tutti (Telegram + Hub)
      for (const agent of allAgents) {
        if (agent.telegramChatId) {
          await sendTelegramMessage(agent.telegramChatId, text)
        }

        // Notifica Push (Browsers)
        try {
          await sendPushNotification(agent.id, {
            title: "📅 Turni Pubblicati",
            body: `Il comando ha pubblicato ufficialmente i turni per ${monthName} ${year}.`,
            url: "/dashboard"
          })
        } catch (pushErr) {
          console.error(`[PUSH ERROR] Impossibile inviare a ${agent.id}:`, pushErr)
        }

        // Creazione Notifica Hub (Database)
        await (prisma as any).notification.create({
          data: {
            title: "📅 Turni Pubblicati",
            message: `Il comando ha pubblicato ufficialmente i turni per ${monthName} ${year}.`,
            type: "SUCCESS",
            userId: agent.id,
            tenantId: tenantId || null,
            link: `/${session.user.tenantSlug}/dashboard`
          }
        })
      }
    }

    return NextResponse.json({ success: true, isPublished: result.isPublished, isLocked: result.isLocked })
  } catch (error) {
    console.error("[PUBLISH MONTH ERROR]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
