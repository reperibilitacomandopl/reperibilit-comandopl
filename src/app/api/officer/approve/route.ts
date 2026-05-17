import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 })
  }

  const u = session.user
  // Può approvare come ufficiale solo se è admin o ufficiale
  if (u.role !== "ADMIN" && !u.isUfficiale && !u.canManageUsers) {
    return NextResponse.json({ error: "Solo ufficiali o admin possono approvare" }, { status: 403 })
  }

  try {
    const { requestId, action, notes } = await request.json()

    if (!requestId || !action) {
      return NextResponse.json({ error: "requestId e action obbligatori" }, { status: 400 })
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "action deve essere 'approve' o 'reject'" }, { status: 400 })
    }

    const reqDoc = await prisma.agentRequest.findUnique({
      where: { id: requestId },
      include: { user: { select: { name: true, telegramChatId: true, telegramOptIn: true } } }
    })

    if (!reqDoc) {
      return NextResponse.json({ error: "Richiesta non trovata" }, { status: 404 })
    }

    if (reqDoc.tenantId !== u.tenantId && !u.isSuperAdmin) {
      return NextResponse.json({ error: "Accesso cross-tenant non autorizzato" }, { status: 403 })
    }

    if (reqDoc.status !== "PENDING_OFFICER") {
      return NextResponse.json({ error: `La richiesta non è in attesa di approvazione ufficiale (stato: ${reqDoc.status})` }, { status: 400 })
    }

    const now = new Date()

    if (action === "reject") {
      await prisma.agentRequest.update({
        where: { id: requestId },
        data: {
          status: "REJECTED",
          reviewedByOfficerId: u.id,
          officerReviewedAt: now,
          officerNotes: notes || "Rifiutata dall'ufficiale di turno"
        }
      })

      // Audit log
      try {
        const { logAudit } = await import("@/lib/audit")
        await logAudit({
          tenantId: u.tenantId,
          adminId: u.id,
          adminName: u.name || undefined,
          action: "REJECT_REQUEST_OFFICER",
          targetId: requestId,
          targetName: reqDoc.user.name,
          details: `Richiesta respinta da UFFICIALE ${u.name} | Agente: ${reqDoc.user.name} | Data: ${new Date(reqDoc.date).toLocaleDateString("it-IT")} | Codice: ${reqDoc.code} | Motivo: ${notes || "Non specificato"}`
        })
      } catch (_) {}

      // Notifica all'agente
      try {
        const { sendTelegramMessage } = await import("@/lib/telegram")
        if (reqDoc.user.telegramChatId && reqDoc.user.telegramOptIn) {
          await sendTelegramMessage(reqDoc.user.telegramChatId, `❌ <b>Richiesta Respinta</b>\n\nLa tua richiesta del ${new Date(reqDoc.date).toLocaleDateString("it-IT")} è stata respinta dall'ufficiale di turno.\nMotivo: ${notes || "Non specificato"}`)
        }
      } catch (_) {}

      return NextResponse.json({ success: true, status: "REJECTED" })
    }

    // APPROVAZIONE UFFICIALE → passa all'admin
    await prisma.agentRequest.update({
      where: { id: requestId },
      data: {
        status: "PENDING_ADMIN",
        reviewedByOfficerId: u.id,
        officerReviewedAt: now,
        officerNotes: notes || null
      }
    })

    // Audit log
    try {
      const { logAudit } = await import("@/lib/audit")
      await logAudit({
        tenantId: u.tenantId,
        adminId: u.id,
        adminName: u.name || undefined,
        action: "APPROVE_REQUEST_OFFICER",
        targetId: requestId,
        targetName: reqDoc.user.name,
        details: `Richiesta approvata da UFFICIALE ${u.name} → in attesa ADMIN | Agente: ${reqDoc.user.name} | Data: ${new Date(reqDoc.date).toLocaleDateString("it-IT")} | Codice: ${reqDoc.code}`
      })
    } catch (_) {}

    // Notifica agli admin
    try {
      const admins = await prisma.user.findMany({
        where: { tenantId: u.tenantId || null, role: "ADMIN", isActive: true },
        select: { id: true }
      })

      await (prisma as any).notification.createMany({
        data: admins.map((a: any) => ({
          tenantId: u.tenantId || null,
          userId: a.id,
          title: "Richiesta — In Attesa Admin",
          message: `${u.name} (uff.) ha approvato la richiesta di ${reqDoc.user.name}. Revisione finale necessaria.`,
          type: "REQUEST",
          link: "/admin/richieste",
          metadata: JSON.stringify({ requestId, step: "admin" })
        }))
      })
    } catch (_) {}

    return NextResponse.json({ success: true, status: "PENDING_ADMIN" })
  } catch (error) {
    console.error("[OFFICER_APPROVE_ERROR]", error)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}
