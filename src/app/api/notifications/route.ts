import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

/**
 * GET: Ritorna le ultime 20 notifiche per l'utente corrente nel suo tenant.
 */
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const tenantId = session.user.tenantId
    const userId = session.user.id

    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000)

    const notifications = await (prisma as any).notification.findMany({
      where: { 
        userId,
        tenantId: tenantId || null,
        OR: [
          { type: { notIn: ["INFO", "SUCCESS"] } }, // Gli ALERT e REQUEST restano
          { createdAt: { gte: twoDaysAgo } }      // INFO e SUCCESS solo se recenti
        ]
      },
      orderBy: { createdAt: "desc" },
      take: 20
    })

    const unreadCount = await (prisma as any).notification.count({
      where: { 
        userId,
        tenantId: tenantId || null,
        isRead: false
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
    const { notificationId, markAllAsRead } = await req.json()
    const tenantId = session.user.tenantId
    const userId = session.user.id

    if (markAllAsRead) {
      await (prisma as any).notification.updateMany({
        where: { 
          userId,
          tenantId: tenantId || null,
          isRead: false
        },
        data: { isRead: true }
      })
    } else if (notificationId) {
      await (prisma as any).notification.update({
        where: { 
          id: notificationId,
          userId // Sicurezza: garantisce che l'utente stia leggendo la propria
        },
        data: { isRead: true }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[NOTIFICATIONS PUT]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
