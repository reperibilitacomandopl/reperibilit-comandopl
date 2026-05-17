import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { logAudit, AUDIT_ACTIONS } from "@/lib/audit"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 })
  }

  const u = session.user
  if (!u.isSuperAdmin && u.role !== "ADMIN" && !u.canManageUsers) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 })
  }

  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "userId richiesto" }, { status: 400 })
    }

    const target = await prisma.user.findUnique({ where: { id: userId } })
    if (!target) {
      return NextResponse.json({ error: "Utente non trovato" }, { status: 404 })
    }

    // Verifica tenant isolation
    if (!u.isSuperAdmin && target.tenantId !== u.tenantId) {
      return NextResponse.json({ error: "Accesso cross-tenant non autorizzato" }, { status: 403 })
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
        lockoutUntil: null,
        lockoutReason: null,
        unlockedBy: u.name || u.matricola
      }
    })

    await logAudit({
      tenantId: u.tenantId,
      adminId: u.id,
      adminName: u.name || u.matricola,
      action: AUDIT_ACTIONS.USER_UPDATE,
      targetId: userId,
      targetName: target.name,
      details: `Account sbloccato manualmente da ${u.name || u.matricola}. Tentativi falliti: ${target.failedLoginAttempts}`
    })

    return NextResponse.json({ success: true, message: `Account di ${target.name} sbloccato` })
  } catch (error) {
    console.error("[UNLOCK_USER_ERROR]", error)
    return NextResponse.json({ error: "Errore durante lo sblocco" }, { status: 500 })
  }
}
