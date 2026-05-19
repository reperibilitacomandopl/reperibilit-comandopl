import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Endpoint per Vercel Cron. Chiamata quotidiana.
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization")
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const now = new Date()

    console.log(`[CRON] Avviato controllo scadenze Trial. Data attuale: ${now.toISOString()}`)

    // Trova i tenant TRIAL ancora attivi con data di fine trial passata
    const expiredTenants = await prisma.tenant.findMany({
      where: {
        planType: "TRIAL",
        isActive: true,
        trialEndsAt: {
          lt: now
        }
      },
      select: {
        id: true,
        name: true,
        slug: true
      }
    })

    if (expiredTenants.length === 0) {
      return NextResponse.json({ success: true, message: "Nessun tenant da sospendere.", count: 0 })
    }

    // Disattiva i tenant scaduti
    const expiredIds = expiredTenants.map((t: any) => t.id)
    
    await prisma.tenant.updateMany({
      where: {
        id: { in: expiredIds }
      },
      data: {
        isActive: false
      }
    })

    console.log(`[CRON] Sospesi ${expiredTenants.length} tenant per fine periodo di prova:`, expiredTenants.map((t: any) => t.name).join(", "))

    // 4. (NOVITÀ) Controllo scadenze contratto imminenti (es. 30 giorni)
    const expiringSoon = await prisma.tenant.findMany({
      where: {
        isActive: true,
        serviceEndDate: {
          gte: now,
          lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
        }
      },
      select: { id: true, name: true, serviceEndDate: true }
    })

    if (expiringSoon.length > 0) {
      // Trova tutti i SuperAdmin per notificarli
      const superAdmins = await prisma.user.findMany({
        where: { isSuperAdmin: true, isActive: true },
        select: { id: true }
      })

      for (const tenant of expiringSoon) {
        const daysLeft = Math.ceil((new Date(tenant.serviceEndDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        
        for (const admin of superAdmins) {
          // Crea notifica se non esiste già una recente (opzionale, qui la creiamo sempre nel check giornaliero)
          await prisma.notification.create({
            data: {
              userId: admin.id,
              title: "⚠️ SCADENZA CONTRATTO IMMINENTE",
              message: `Il contratto per il comando "${tenant.name}" scadrà tra ${daysLeft} giorni (${new Date(tenant.serviceEndDate!).toLocaleDateString('it-IT')}).`,
              type: "ALERT",
              metadata: JSON.stringify({ tenantId: tenant.id, type: "CONTRACT_EXPIRY" })
            }
          })
        }
      }
      console.log(`[CRON] Generate notifiche per ${expiringSoon.length} contratti in scadenza.`)
    }

    return NextResponse.json({ 
      success: true, 
      message: "Tenant Check Completed", 
      suspendedCount: expiredTenants.length,
      expiringSoonCount: expiringSoon.length
    })
  } catch (error) {
    console.error("[CRON] Errore Tenant Check:", error)
    return NextResponse.json({ error: "Errore interno durante il controllo scadenze" }, { status: 500 })
  }
}
