import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Protezione base Vercel Cron. Solo le invocazioni da Vercel Cron avranno l'Authorization header corretto.
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const startTime = Date.now()
  const results: Record<string, number> = {}

  try {
    console.log(`[CRON] ══════════════════════════════════════════`)
    console.log(`[CRON] Avviata pulizia Data Retention GDPR — ${new Date().toISOString()}`)
    console.log(`[CRON] Policy: GPS=6m, Notifiche=6m, Annunci=30gg, Audit=12m, Swap=12m`)

    // ═══════════════════════════════════════════════════════════
    // 1. GPS & TIMBRATURE — 6 mesi (Art. 4 L. 300/1970)
    // ═══════════════════════════════════════════════════════════
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const deletedClock = await prisma.clockRecord.deleteMany({
      where: { timestamp: { lt: sixMonthsAgo } }
    })
    results.clockRecords = deletedClock.count

    // Azzera anche le coordinate GPS in tempo reale degli utenti non attivi
    const clearedGps = await prisma.user.updateMany({
      where: {
        lastSeenAt: { lt: sixMonthsAgo },
        lastLat: { not: null }
      },
      data: { lastLat: null, lastLng: null, lastSeenAt: null }
    })
    results.gpsCleared = clearedGps.count

    // ═══════════════════════════════════════════════════════════
    // 2. NOTIFICHE — 6 mesi
    // ═══════════════════════════════════════════════════════════
    const deletedNotif = await prisma.notification.deleteMany({
      where: { createdAt: { lt: sixMonthsAgo } }
    })
    results.notifications = deletedNotif.count

    // ═══════════════════════════════════════════════════════════
    // 3. ANNUNCI / BACHECA — 30 giorni (comunicazioni operative)
    // ═══════════════════════════════════════════════════════════
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const deletedAnnouncements = await prisma.announcement.deleteMany({
      where: { createdAt: { lt: thirtyDaysAgo }, isPinned: false }
    })
    results.announcements = deletedAnnouncements.count

    // Annunci fissati: cancella dopo 90 giorni anche se pinnati
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const deletedPinned = await prisma.announcement.deleteMany({
      where: { createdAt: { lt: ninetyDaysAgo } }
    })
    results.pinnedAnnouncements = deletedPinned.count

    // ═══════════════════════════════════════════════════════════
    // 4. AUDIT LOG — 12 mesi (sicurezza ICT AgID)
    // ═══════════════════════════════════════════════════════════
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

    const deletedAudits = await prisma.auditLog.deleteMany({
      where: { createdAt: { lt: oneYearAgo } }
    })
    results.auditLogs = deletedAudits.count

    // ═══════════════════════════════════════════════════════════
    // 5. SWAP REQUESTS — 12 mesi (completati/rifiutati)
    // ═══════════════════════════════════════════════════════════
    const deletedSwaps = await prisma.shiftSwapRequest.deleteMany({
      where: {
        createdAt: { lt: oneYearAgo },
        status: { in: ["APPROVED", "REJECTED", "CANCELLED"] }
      }
    })
    results.swapRequests = deletedSwaps.count

    // ═══════════════════════════════════════════════════════════
    // 6. EMERGENCY ALERTS — 6 mesi
    // ═══════════════════════════════════════════════════════════
    const deletedAlerts = await prisma.emergencyAlert.deleteMany({
      where: { date: { lt: sixMonthsAgo } }
    })
    results.emergencyAlerts = deletedAlerts.count

    // ═══════════════════════════════════════════════════════════
    // 7. UTENTI DISATTIVATI — Anonimizza dopo 2 anni
    // ═══════════════════════════════════════════════════════════
    const twoYearsAgo = new Date()
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)

    const staleUsers = await prisma.user.findMany({
      where: {
        isActive: false,
        updatedAt: { lt: twoYearsAgo },
        name: { not: { startsWith: "UTENTE_CANCELLATO" } }
      },
      select: { id: true, matricola: true }
    })

    for (const u of staleUsers) {
      await prisma.user.update({
        where: { id: u.id },
        data: {
          name: `UTENTE_ANONIMIZZATO_${u.matricola}`,
          email: null,
          phone: null,
          password: "ANONYMIZED",
          dataDiNascita: null,
          noteInterne: null,
          telegramChatId: null
        }
      })
    }
    results.anonymizedUsers = staleUsers.length

    const elapsed = Date.now() - startTime
    console.log(`[CRON] ✅ Data Retention completata in ${elapsed}ms`)
    console.log(`[CRON] Risultati:`, JSON.stringify(results))

    return NextResponse.json({
      success: true,
      message: "Data Retention GDPR completata",
      elapsed: `${elapsed}ms`,
      deleted: results
    })
  } catch (error) {
    console.error("[CRON] ❌ Errore Data Retention:", error)
    return NextResponse.json({ error: "Errore interno durante pulizia" }, { status: 500 })
  }
}
