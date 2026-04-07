import { prisma } from "./prisma"

export async function logAudit({
  tenantId,
  adminId,
  adminName,
  action,
  targetId,
  targetName,
  details
}: {
  tenantId?: string | null
  adminId: string
  adminName?: string
  action: string
  targetId?: string
  targetName?: string
  details: string
}) {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId: tenantId || null,
        adminId,
        adminName,
        action,
        targetId,
        targetName,
        details
      }
    })
  } catch (error) {
    console.error("[AUDIT_LOG_ERROR]", error)
  }
}
