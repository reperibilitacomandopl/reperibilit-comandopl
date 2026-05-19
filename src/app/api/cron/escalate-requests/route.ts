import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null
  const expected = process.env.CRON_SECRET

  if (!expected || token !== expected) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  }

  try {
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000) // 48 ore fa

    // Trova richieste in attesa ufficiale da più di 48h
    const expired = await prisma.agentRequest.findMany({
      where: {
        status: "PENDING_OFFICER",
        createdAt: { lt: cutoff }
      },
      include: {
        user: { select: { name: true } },
        tenant: { select: { id: true, name: true } }
      }
    })

    if (expired.length === 0) {
      return NextResponse.json({ success: true, escalated: 0 })
    }

    // Escala automaticamente a PENDING_ADMIN
    const now = new Date()
    for (const req of expired) {
      await prisma.agentRequest.update({
        where: { id: req.id },
        data: {
          status: "PENDING_ADMIN",
          escalatedAt: now,
          officerNotes: req.officerNotes
            ? `${req.officerNotes} | Auto-escalato dopo 48h per timeout ufficiale`
            : "Auto-escalato dopo 48h per timeout ufficiale di turno"
        }
      })

      // Notifica admin dell'escalation
      try {
        const admins = await prisma.user.findMany({
          where: { tenantId: req.tenantId, role: "ADMIN", isActive: true },
          select: { id: true }
        })

        await (prisma as any).notification.createMany({
          data: admins.map((a: any) => ({
            tenantId: req.tenantId,
            userId: a.id,
            title: "Richiesta Auto-Escalata ⏰",
            message: `Richiesta di ${req.user.name} in attesa da oltre 48h. Escalata automaticamente all'admin per approvazione finale.`,
            type: "ALERT",
            link: "/admin/richieste",
            metadata: JSON.stringify({ requestId: req.id, escalated: true })
          }))
        })
      } catch (_) {}
    }

    return NextResponse.json({ success: true, escalated: expired.length })
  } catch (error) {
    console.error("[ESCALATE_REQUESTS_ERROR]", error)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}
