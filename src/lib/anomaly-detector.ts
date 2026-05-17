import { getTenantUsageSummary } from "@/lib/rate-limit"
import { prisma } from "@/lib/prisma"
import { notifyAdminActivity } from "@/lib/telegram"

/**
 * Verifica anomalie per tutti i tenant attivi e invia alert se necessario.
 * Da chiamare via cron job o a ogni N richieste.
 */
export async function checkAllTenantsAnomalies(): Promise<void> {
  try {
    const tenants = await prisma.tenant.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true }
    })

    for (const tenant of tenants) {
      const summary = await getTenantUsageSummary(tenant.id)

      if (summary.status === "critical") {
        await notifyAdminActivity(
          `🚨 <b>ANOMALIA CRITICA RILEVATA</b>\n\n` +
          `Comando: ${tenant.name} (${tenant.slug})\n` +
          `Operazioni ultimi 10 min: ${summary.opsLast10Min}\n` +
          `Media operazioni/min: ${summary.avgOpsPerMin}\n` +
          `Volume: ${summary.opsLast10Min > summary.avgOpsPerMin * 10 ? Math.round(summary.opsLast10Min / (summary.avgOpsPerMin * 10) * 100) : 0}% sopra la media\n\n` +
          `Possibile attacco DoS o abuso in corso.`,
          tenant.id
        )
      } else if (summary.status === "warning") {
        // Warning: logga ma non notifica (troppo rumoroso)
        console.warn(`[ANOMALY_WARNING] Tenant ${tenant.slug}: ${summary.opsLast10Min} ops in 10min (avg: ${summary.avgOpsPerMin}/min)`)
      }
    }
  } catch (error) {
    console.error("[ANOMALY_CHECK_ERROR]", error)
  }
}

/**
 * Da chiamare dopo ogni richiesta API autenticata.
 * Controlla se il tenant sta abusando e se bisogna attivare contromisure.
 */
export async function checkRequestAnomaly(tenantId: string): Promise<boolean> {
  const summary = await getTenantUsageSummary(tenantId)
  if (summary.status === "critical") {
    // Blocca la richiesta se il volume è 5x sopra la media
    console.warn(`[ANOMALY_BLOCK] Tenant ${tenantId}: richiesta bloccata per volume anomalo`)
    return false
  }
  return true
}
