import { prisma } from "./prisma"
import { headers } from "next/headers"

export async function logAudit({
  tenantId,
  adminId,
  adminName,
  action,
  targetId,
  targetName,
  details,
  ipAddress,
  userAgent
}: {
  tenantId?: string | null
  adminId: string
  adminName?: string
  action: string
  targetId?: string
  targetName?: string
  details: string
  ipAddress?: string
  userAgent?: string
}) {
  try {
    let finalIp = ipAddress;
    let finalUserAgent = userAgent;

    // Se non passati, proviamo a recuperarli dal contesto della richiesta Next.js
    if (!finalIp || !finalUserAgent) {
      try {
        const headersList = await headers()
        if (!finalIp) {
           finalIp = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     headersList.get("x-real-ip") || 
                     "unknown";
        }
        if (!finalUserAgent) {
           finalUserAgent = headersList.get("user-agent") || "unknown";
        }
      } catch (e) {
        // Ignora: siamo probabilmente fuori da un contesto di Request (es. Cron Job)
      }
    }

    await prisma.auditLog.create({
      data: {
        tenantId: tenantId || null,
        adminId,
        adminName,
        action,
        targetId,
        targetName,
        details,
        ipAddress: finalIp,
        userAgent: finalUserAgent
      }
    })
  } catch (error) {
    console.error("[AUDIT_LOG_ERROR]", error)
  }
}
