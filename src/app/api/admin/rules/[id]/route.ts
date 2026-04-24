import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await auth()
    if (!session?.user?.id || !session.user.tenantId) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const u = session.user;
    if (!u.isSuperAdmin && u.role !== "ADMIN" && !u.canConfigureSystem) {
      return NextResponse.json({ error: "Accesso negato. Solo gli amministratori di sistema possono modificare le regole." }, { status: 403 })
    }

    const body = await req.json()
    const { name, type, targetRole, config, isActive } = body

    // Verify ownership
    const existing = await prisma.shiftRule.findUnique({
      where: { id: id }
    })

    if (!existing || existing.tenantId !== session.user.tenantId) {
      return NextResponse.json({ error: "Regola non trovata" }, { status: 404 })
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (type !== undefined) updateData.type = type
    if (targetRole !== undefined) updateData.targetRole = targetRole
    if (config !== undefined) updateData.config = typeof config === 'string' ? config : JSON.stringify(config)
    if (isActive !== undefined) updateData.isActive = isActive

    const rule = await prisma.shiftRule.update({
      where: { id: id },
      data: updateData
    })

    return NextResponse.json(rule)
  } catch (error) {
    console.error("PUT /api/admin/rules/[id] error:", error)
    return NextResponse.json({ error: "Errore interno server" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await auth()
    if (!session?.user?.id || !session.user.tenantId) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const u = session.user;
    if (!u.isSuperAdmin && u.role !== "ADMIN" && !u.canConfigureSystem) {
      return NextResponse.json({ error: "Accesso negato." }, { status: 403 })
    }

    // Verify ownership
    const existing = await prisma.shiftRule.findUnique({
      where: { id: id }
    })

    if (!existing || existing.tenantId !== session.user.tenantId) {
      return NextResponse.json({ error: "Regola non trovata" }, { status: 404 })
    }

    await prisma.shiftRule.delete({
      where: { id: id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/admin/rules/[id] error:", error)
    return NextResponse.json({ error: "Errore interno server" }, { status: 500 })
  }
}
