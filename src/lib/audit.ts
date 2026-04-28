import { prisma } from "./prisma"
import { headers } from "next/headers"

// Costanti per tipologie di Audit (Requisito AgID/GDPR)
export const AUDIT_ACTIONS = {
  LOGIN: "LOGIN",
  LOGIN_FAILED: "LOGIN_FAILED",
  LOGOUT: "LOGOUT",
  IMPERSONATE: "IMPERSONATE",
  IMPERSONATE_STOP: "IMPERSONATE_STOP",
  GDPR_DATA_EXPORT: "GDPR_DATA_EXPORT",
  PRIVACY_CONSENT: "PRIVACY_CONSENT",
  GPS_CONSENT: "GPS_CONSENT",
  PROFILE_UPDATE: "PROFILE_UPDATE",
  SHIFT_CREATE: "SHIFT_CREATE",
  SHIFT_UPDATE: "SHIFT_UPDATE",
  SHIFT_DELETE: "SHIFT_DELETE",
  USER_CREATE: "USER_CREATE",
  USER_UPDATE: "USER_UPDATE",
  USER_DELETE: "USER_DELETE",
  SYSTEM_CONFIG: "SYSTEM_CONFIG"
} as const;

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
