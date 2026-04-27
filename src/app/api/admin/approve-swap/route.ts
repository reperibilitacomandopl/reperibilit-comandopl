// @ts-nocheck
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { sendTelegramMessage } from "@/lib/telegram"
import { sendPushNotification } from "@/lib/push-notifications"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user || (session.user.role !== "ADMIN" && !session?.user?.canManageShifts)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const tenantId = session.user.tenantId
    const tenantSlug = session.user.tenantSlug || ""
    const { swapId } = await req.json()

    if (!swapId) return NextResponse.json({ error: "ID Mancante" }, { status: 400 })

    const swapRequest = await prisma.shiftSwapRequest.findFirst({
      where: { id: swapId, tenantId: tenantId || null },
      include: { shift: true }
    })

    if (!swapRequest) return NextResponse.json({ error: "Richiesta non trovata o non appartenente al tuo comando" }, { status: 404 })
    if (swapRequest.status !== "ACCEPTED") {
      return NextResponse.json({ error: "Lo scambio deve essere prima accettato dal collega" }, { status: 400 })
    }

    const sourceShift = swapRequest.shift
    
    // Performance atomic swap in DB
    const transactions = [
      prisma.shiftSwapRequest.update({
        where: { id: swapId },
        data: { status: "APPROVED_BY_ADMIN" }
      }),
      // Sposta la reperibilità (o l'intero turno identificativo) dal richiedente al destinatario
      prisma.shift.upsert({
        where: { userId_date_tenantId: { userId: swapRequest.targetUserId, date: sourceShift.date, tenantId: tenantId || "" } },
        update: { repType: sourceShift.repType || sourceShift.type },
        create: {
          tenantId: tenantId || null,
          userId: swapRequest.targetUserId,
          date: sourceShift.date,
          type: "RIPOSO", // Fallback
          repType: sourceShift.repType || sourceShift.type,
          durationHours: sourceShift.durationHours,
          serviceCategoryId: sourceShift.serviceCategoryId,
          serviceTypeId: sourceShift.serviceTypeId
        }
      }),
      // Pulisce il turno del richiedente originale
      prisma.shift.update({
        where: { id: sourceShift.id },
        data: { repType: null }
      })
    ]

    const [updatedRequest, updatedShift, _] = await prisma.$transaction(transactions)

    // NOTIFICA TELEGRAM & PUSH
    try {
      const requester = await prisma.user.findUnique({ where: { id: swapRequest.requesterId } })
      const target = await prisma.user.findUnique({ where: { id: swapRequest.targetUserId } })
      
      const dateStr = new Date(sourceShift.date).toLocaleDateString("it-IT")
      const portalUrl = `/${tenantSlug}/?view=agent`

      if (requester) {
        const textToRequester = `✅ <b>Scambio Approvato</b>\n\nCiao ${requester.name}, il Comando ha approvato ufficialmente lo scambio del turno del <b>${dateStr}</b> con il collega ${target?.name || "un collega"}.`
        if (requester.telegramChatId) await sendTelegramMessage(requester.telegramChatId, textToRequester)
        await sendPushNotification(requester.id, {
          title: "✅ Scambio Approvato",
          body: `Il tuo scambio turno per il ${dateStr} è stato approvato dal Comando.`,
          url: portalUrl
        })
      }
      
      if (target) {
        const textToTarget = `✅ <b>Scambio Approvato</b>\n\nCiao ${target.name}, il Comando ha approvato ufficialmente lo scambio del turno del <b>${dateStr}</b>. Ora il turno di ${sourceShift.repType || "Reperibilità"} è assegnato a te.`
        if (target.telegramChatId) await sendTelegramMessage(target.telegramChatId, textToTarget)
        await sendPushNotification(target.id, {
          title: "✅ Nuovo Turno Assegnato",
          body: `Ti è stato ufficialmente assegnato il turno del ${dateStr} a seguito di uno scambio.`,
          url: portalUrl
        })
      }
    } catch (e) {
      console.error("Notification Error (Swap):", e)
    }

    return NextResponse.json({ success: true, request: updatedRequest, shift: updatedShift })
  } catch (err) {
    console.error("Error approving swap:", err)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
