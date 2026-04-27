import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendPushNotification } from "@/lib/push-notifications"

/**
 * CRON JOB — Alert Scadenze Documentali
 */

const DAYS_BEFORE_ALERT = 30

export async function GET(req: Request) {
  // Verifica CRON secret (opzionale per sicurezza)
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const now = new Date()
    const alertDate = new Date(now.getTime() + DAYS_BEFORE_ALERT * 24 * 60 * 60 * 1000)
    
    let totalAlerts = 0
    const alerts: { type: string; name: string; scadenza: string; tenantId: string | null }[] = []

    // 1. PATENTI IN SCADENZA
    const agentsPatente = await prisma.user.findMany({
      where: {
        isActive: true,
        scadenzaPatente: { lte: alertDate, gte: now }
      },
      select: { id: true, name: true, tenantId: true, scadenzaPatente: true }
    })

    for (const agent of agentsPatente) {
      const daysLeft = Math.ceil((agent.scadenzaPatente!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      alerts.push({ type: "PATENTE", name: agent.name, scadenza: `${daysLeft} giorni`, tenantId: agent.tenantId })
      
      // Crea notifica (evita duplicati controllando le ultime 24h)
      const existingNotif = await prisma.notification.findFirst({
        where: {
          userId: agent.id,
          type: "WARNING",
          title: { contains: "Patente" },
          createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
        }
      })
      
      if (!existingNotif) {
        const title = "⚠️ Patente in Scadenza"
        const message = `La tua patente scade tra ${daysLeft} giorni. Provvedi al rinnovo.`
        
        await prisma.notification.create({
          data: {
            userId: agent.id,
            tenantId: agent.tenantId,
            title,
            message,
            type: "WARNING"
          }
        })

        // Invia Push
        await sendPushNotification(agent.id, {
          title,
          body: message
        })

        totalAlerts++
      }
    }

    // 2. PORTO D'ARMI IN SCADENZA
    const agentsPortoArmi = await prisma.user.findMany({
      where: {
        isActive: true,
        scadenzaPortoArmi: { lte: alertDate, gte: now }
      },
      select: { id: true, name: true, tenantId: true, scadenzaPortoArmi: true }
    })

    for (const agent of agentsPortoArmi) {
      const daysLeft = Math.ceil((agent.scadenzaPortoArmi!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      alerts.push({ type: "PORTO_ARMI", name: agent.name, scadenza: `${daysLeft} giorni`, tenantId: agent.tenantId })
      
      const existingNotif = await prisma.notification.findFirst({
        where: {
          userId: agent.id,
          type: "WARNING",
          title: { contains: "Porto" },
          createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
        }
      })
      
      if (!existingNotif) {
        const title = "🔫 Porto d'Armi in Scadenza"
        const message = `Il tuo porto d'armi scade tra ${daysLeft} giorni. Contatta l'armiere per il rinnovo.`
        
        await prisma.notification.create({
          data: {
            userId: agent.id,
            tenantId: agent.tenantId,
            title,
            message,
            type: "WARNING"
          }
        })

        // Invia Push
        await sendPushNotification(agent.id, {
          title,
          body: message
        })

        totalAlerts++
      }
    }

    // 3. KEVLAR GIUBBOTTI IN SCADENZA
    const armorsExpiring = await prisma.armor.findMany({
      where: {
        stato: "ATTIVO",
        scadenzaKevlar: { lte: alertDate, gte: now }
      },
      select: { id: true, name: true, tenantId: true, scadenzaKevlar: true, assegnazioneFissaId: true }
    })

    for (const armor of armorsExpiring) {
      const daysLeft = Math.ceil((armor.scadenzaKevlar!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      alerts.push({ type: "KEVLAR", name: armor.name, scadenza: `${daysLeft} giorni`, tenantId: armor.tenantId })
      
      // Notifica all'assegnatario se presente
      if (armor.assegnazioneFissaId) {
        const existingNotif = await prisma.notification.findFirst({
          where: {
            userId: armor.assegnazioneFissaId,
            type: "WARNING",
            title: { contains: "Giubbotto" },
            createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
          }
        })
        
        if (!existingNotif) {
          const title = "🛡️ Giubbotto Antiproiettile in Scadenza"
          const message = `Il giubbotto "${armor.name}" scade tra ${daysLeft} giorni. Segnalare all'armiere.`
          
          await prisma.notification.create({
            data: {
              userId: armor.assegnazioneFissaId,
              tenantId: armor.tenantId,
              title,
              message,
              type: "WARNING"
            }
          })

          await sendPushNotification(armor.assegnazioneFissaId, {
            title,
            body: message
          })

          totalAlerts++
        }
      }
    }

    // 4. VEICOLI — SCADENZE (Assicurazione, Bollo, Revisione)
    const vehicles = await prisma.vehicle.findMany({
      where: {
        stato: "ATTIVO",
        OR: [
          { scadenzaAssicurazione: { lte: alertDate, gte: now } },
          { scadenzaBollo: { lte: alertDate, gte: now } },
          { scadenzaRevisione: { lte: alertDate, gte: now } }
        ]
      },
      select: { id: true, name: true, tenantId: true, targa: true, scadenzaAssicurazione: true, scadenzaBollo: true, scadenzaRevisione: true }
    })

    for (const v of vehicles) {
      const checks = [
        { label: "Assicurazione", date: v.scadenzaAssicurazione },
        { label: "Bollo", date: v.scadenzaBollo },
        { label: "Revisione", date: v.scadenzaRevisione }
      ]
      
      for (const check of checks) {
        if (check.date && check.date <= alertDate && check.date >= now) {
          const daysLeft = Math.ceil((check.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          alerts.push({ 
            type: `VEICOLO_${check.label.toUpperCase()}`, 
            name: `${v.name} (${v.targa || 'N/A'})`, 
            scadenza: `${daysLeft} giorni`, 
            tenantId: v.tenantId 
          })
        }
      }

      // Notifica agli admin del tenant
      if (v.tenantId) {
        const admins = await prisma.user.findMany({
          where: { tenantId: v.tenantId, role: "ADMIN", isActive: true },
          select: { id: true }
        })
        
        for (const admin of admins) {
          const existingNotif = await prisma.notification.findFirst({
            where: {
              userId: admin.id,
              type: "WARNING",
              title: { contains: v.name },
              createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
            }
          })
          
          if (!existingNotif) {
            const expiringItems = checks
              .filter(c => c.date && c.date <= alertDate && c.date >= now)
              .map(c => {
                const dl = Math.ceil((c.date!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                return `${c.label}: ${dl}gg`
              }).join(", ")

            const title = `🚗 Scadenza Veicolo: ${v.name}`
            const message = `Il veicolo ${v.name} (${v.targa || 'N/A'}) ha scadenze imminenti: ${expiringItems}`

            await prisma.notification.create({
              data: {
                userId: admin.id,
                tenantId: v.tenantId,
                title,
                message,
                type: "WARNING"
              }
            })

            await sendPushNotification(admin.id, {
              title,
              body: message
            })

            totalAlerts++
          }
        }
      }
    }

    // 5. NOTIFICHE ADMIN — Riepilogo giornaliero scadenze (solo se ci sono alert)
    if (alerts.length > 0) {
      // Raggruppa per tenant
      const byTenant: Record<string, typeof alerts> = {}
      alerts.forEach(a => {
        const key = a.tenantId || "GLOBAL"
        if (!byTenant[key]) byTenant[key] = []
        byTenant[key].push(a)
      })

      for (const [tenantId, tenantAlerts] of Object.entries(byTenant)) {
        if (tenantId === "GLOBAL") continue
        
        const admins = await prisma.user.findMany({
          where: { tenantId, role: "ADMIN", isActive: true },
          select: { id: true }
        })

        for (const admin of admins) {
          const existingDigest = await prisma.notification.findFirst({
            where: {
              userId: admin.id,
              title: { contains: "Riepilogo Scadenze" },
              createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
            }
          })

          if (!existingDigest) {
            const summary = tenantAlerts.map(a => `• ${a.type}: ${a.name} (${a.scadenza})`).join("\n")
            await prisma.notification.create({
              data: {
                userId: admin.id,
                tenantId,
                title: `📋 Riepilogo Scadenze (${tenantAlerts.length})`,
                message: `Scadenze entro ${DAYS_BEFORE_ALERT} giorni:\n${summary}`,
                type: "WARNING"
              }
            })
          }
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      alertsGenerated: totalAlerts,
      expiringItems: alerts.length,
      details: alerts
    })
  } catch (error) {
    console.error("[CRON] Expiry alerts error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
