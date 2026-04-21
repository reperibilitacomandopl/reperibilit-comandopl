import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Protezione base Vercel Cron. Solo le invocazioni da Vercel Cron avranno l'Authorization header corretto.
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // 6 mesi fa
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    // 12 mesi fa
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

    // Pulizia massiva per liberare spazio nel database PostgreSQL
    console.log(`[CRON] Avviata pulizia data retention. Target: dati precendenti a ${sixMonthsAgo.toISOString()}`);

    // 1. Oltre 6 mesi: Eliminiamo i record di timbratura (ClockRecord) GPS.
    const deletedClockRecords = await prisma.clockRecord.deleteMany({
      where: { timestamp: { lt: sixMonthsAgo } }
    })

    // 2. Oltre 6 mesi: Eliminiamo notifiche lette e/o archiviate molto vecchie.
    const deletedNotifications = await prisma.notification.deleteMany({
      where: { createdAt: { lt: sixMonthsAgo } }
    })

    // 3. Oltre 1 anno: Eliminiamo gli audit log di routine (mantenendo solo le variazioni saldi magari, ma qui cancelliamo tutto > 1a)
    const deletedAudits = await prisma.auditLog.deleteMany({
      where: { createdAt: { lt: oneYearAgo } }
    })

    return NextResponse.json({
      success: true,
      message: "Data Retention Completed",
      deleted: {
        clockRecords: deletedClockRecords.count,
        notifications: deletedNotifications.count,
        auditLogs: deletedAudits.count
      }
    })
  } catch (error) {
    console.error("[CRON] Errore Data Retention:", error)
    return NextResponse.json({ error: "Errore interno durante pulizia" }, { status: 500 })
  }
}
