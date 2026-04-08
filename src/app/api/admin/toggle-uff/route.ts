// @ts-nocheck
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && !session?.user?.canManageUsers) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const tenantId = session.user.tenantId
    const { userId } = await req.json()
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })

    const user = await prisma.user.findFirst({ 
      where: { id: userId, tenantId: tenantId || null } 
    })
    if (!user) return NextResponse.json({ error: "Utente non trovato o non appartenente al tuo comando" }, { status: 404 })

    const updated = await prisma.user.update({
      where: { id: userId, tenantId: tenantId || null },
      data: { isUfficiale: !user.isUfficiale }
    })

    const { logAudit } = await import("@/lib/audit")
    await logAudit({
      tenantId,
      adminId: session.user.id!,
      adminName: session.user.name!,
      action: "TOGGLE_UFF",
      targetId: userId,
      targetName: updated.name,
      details: `Cambiata qualifica Ufficiale per ${updated.name} a ${updated.isUfficiale}`
    })

    return NextResponse.json({ 
      success: true, 
      userId, 
      isUfficiale: updated.isUfficiale 
    })
  } catch (error) {
    console.error("[TOGGLE UFF ERROR]", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
