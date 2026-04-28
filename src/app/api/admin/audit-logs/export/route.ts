import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const session = await auth()
  
  // Solitamente solo chi può gestire il sistema/utenti dovrebbe poter esportare l'audit log
  if (session?.user?.role !== "ADMIN" && !session?.user?.canConfigureSystem && !session?.user?.isSuperAdmin) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  try {
    const tenantId = session.user.tenantId
    const logs = await prisma.auditLog.findMany({
      where: { tenantId: tenantId || null },
      orderBy: { createdAt: "desc" },
      // Esportiamo un numero ragionevole di log o tutti
      take: 5000 
    })

    // Creazione CSV
    const header = ["Data/Ora", "Operatore (ID)", "Operatore (Nome)", "Azione", "IP Address", "User-Agent", "ID Soggetto/Target", "Nome Soggetto/Target", "Dettagli"]
    
    const rows = logs.map((log: any) => {
      return [
        new Date(log.createdAt).toISOString(),
        log.adminId,
        log.adminName || "",
        log.action,
        log.ipAddress || "",
        log.userAgent || "",
        log.targetId || "",
        log.targetName || "",
        `"${log.details.replace(/"/g, '""')}"` // Escape double quotes per CSV
      ].join(",")
    })

    const csvContent = [header.join(","), ...rows].join("\n")

    const headers = new Headers()
    headers.set("Content-Type", "text/csv; charset=utf-8")
    headers.set("Content-Disposition", `attachment; filename="audit_log_${new Date().toISOString().split('T')[0]}.csv"`)

    return new NextResponse(csvContent, { status: 200, headers })
  } catch (error) {
    console.error("[AUDIT_EXPORT_ERROR]", error)
    return new NextResponse("Errore interno durante esportazione", { status: 500 })
  }
}
