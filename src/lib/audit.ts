import { prisma } from "./prisma"

export async function logAudit({
  adminId,
  adminName,
  action,
  targetId,
  targetName,
  details
}: {
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
