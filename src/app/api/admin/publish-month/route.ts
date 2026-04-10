import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit"
import { sendTelegramMessage } from "@/lib/telegram"

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && !session?.user?.canManageShifts) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const tenantId = session.user.tenantId
    const { month, year, isPublished } = await req.json()
    
    const result = await prisma.monthStatus.upsert({
      where: {
        month_year_tenantId: { month, year, tenantId: tenantId || "" }
      },
      update: {
        isPublished
      },
      create: {
        month: month,
        year: year,
        isPublished: isPublished,
        tenantId: tenantId || null
      }
    })

    await logAudit({
      tenantId: tenantId || null,
      adminId: session.user.id!,
      adminName: session.user.name!,
      action: isPublished ? "PUBLISH_MONTH" : "UNPUBLISH_MONTH",
      details: `${isPublished ? 'Pubblicati' : 'Ritirati'} turni per il periodo ${month}/${year}`
    })

    // NOTIFICA BROADCAST TELEGRAM
    if (isPublished) {
      const monthNames = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"]
      const monthName = monthNames[month - 1] || month
      
      const agentsToNotify = await prisma.user.findMany({
        where: { 
          tenantId: tenantId || null, 
          telegramChatId: { not: null },
          isActive: true
        },
        select: { telegramChatId: true, name: true }
      })

      const text = `📢 <b>PIANIFICAZIONE PUBBLICATA</b>\n\nAttenzione, i turni per il mese di <b>${monthName} ${year}</b> sono stati pubblicati ufficialmente.\n\nControlla ora il tuo pannello agente per visualizzare i dettagli.`
      
      // Invio asincrono a tutti
      for (const agent of agentsToNotify) {
        if (agent.telegramChatId) {
          await sendTelegramMessage(agent.telegramChatId, text)
        }
      }
    }

    return NextResponse.json({ success: true, isPublished: result.isPublished })
  } catch (error) {
    console.error("[PUBLISH MONTH ERROR]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
