import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { sendTelegramMessage } from "@/lib/telegram"

/**
 * GET: Ritorna le ultime 20 notifiche per l'utente corrente nel suo tenant.
 */
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const tenantId = session.user.tenantId
    const userId = session.user.id

    const notifications = await (prisma as any).notification.findMany({
      where: { 
        userId,
        OR: [
          { tenantId: tenantId || null },
          { tenantId: null } // Fallback per notifiche orfane
        ]
      },
      orderBy: { createdAt: "desc" },
      take: 100
    })

    const unreadCount = await (prisma as any).notification.count({
      where: { 
        userId,
        tenantId: tenantId || null,
        isRead: false,
        isArchived: false
      }
    })

    return NextResponse.json({ success: true, notifications, unreadCount })
  } catch (error) {
    console.error("[NOTIFICATIONS GET]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}

/**
 * PUT: Segna le notifiche come lette.
 * Può ricevere { notificationId: string } per una singola notifica,
 * oppure { markAllAsRead: true } per tutte.
 */
export async function PUT(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { notificationId, markAllAsRead, archiveAll, archiveId } = await req.json()
    const tenantId = session.user.tenantId
    const userId = session.user.id

    if (markAllAsRead) {
      await (prisma as any).notification.updateMany({
        where: { userId, tenantId: tenantId || null, isRead: false },
        data: { isRead: true }
      })
    } else if (archiveAll) {
      await (prisma as any).notification.updateMany({
        where: { userId, tenantId: tenantId || null, isArchived: false },
        data: { isArchived: true, isRead: true }
      })
    } else if (notificationId) {
      await (prisma as any).notification.update({
        where: { id: notificationId, userId },
        data: { isRead: true }
      })
    } else if (archiveId) {
      await (prisma as any).notification.update({
        where: { id: archiveId, userId },
        data: { isArchived: true, isRead: true }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[NOTIFICATIONS PUT]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
/**
 * POST: Invia notifiche multicanale (es. Telegram)
 */
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { title, message, type, channels } = await req.json()
    const tenantId = session.user.tenantId

    if (type === "ALARM" && channels?.includes("TELEGRAM")) {
      // 1. Identifica chi è reperibile oggi
      const now = new Date()
      const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

      const dutyTeam = await prisma.shift.findMany({
        where: {
          date: today,
          tenantId: tenantId || null,
          repType: { not: null }
        },
        include: {
          user: { select: { telegramChatId: true, name: true } }
        }
      })

      const recipients = dutyTeam.filter((s: any) => s.user.telegramChatId).map((s: any) => s.user.telegramChatId!)
      
      const alarmText = `🚨 <b>${title}</b> 🚨\n\n${message}`
      
      const sendResults = await Promise.all(
        recipients.map((chatId: any) => sendTelegramMessage(chatId, alarmText))
      )

      // Registra anche una notifica nel database per l'app
      await Promise.all(dutyTeam.map((s: any) => 
        (prisma as any).notification.create({
          data: {
            userId: s.userId,
            tenantId: tenantId || null,
            title: title || "Allarme Reperibilità",
            message: message,
            type: "ALARM"
          }
        })
      ))

      return NextResponse.json({ 
        success: true, 
        sentCount: sendResults.filter(r => r).length,
        totalDuty: dutyTeam.length 
      })
    }

    return NextResponse.json({ error: "Action not supported or missing data" }, { status: 400 })
  } catch (error) {
    console.error("[NOTIFICATIONS POST]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
