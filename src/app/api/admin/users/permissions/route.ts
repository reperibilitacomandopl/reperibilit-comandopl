import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const session = await auth()
  
  // Solo gli ADMIN possono cambiare i permessi
  if (!session?.user || (session.user.role !== "ADMIN" && !session?.user?.canManageUsers)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { userId, permissions } = await req.json()

    if (!userId || !permissions) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 })
    }

    // Verifica che l'utente appartenga allo stesso tenant
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { tenantId: true }
    })

    if (!targetUser || targetUser.tenantId !== session.user.tenantId) {
      return NextResponse.json({ error: "User not found or different tenant" }, { status: 403 })
    }

    // Aggiorna i permessi
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        canManageShifts: permissions.canManageShifts,
        canManageUsers: permissions.canManageUsers,
        canVerifyClockIns: permissions.canVerifyClockIns,
        canConfigureSystem: permissions.canConfigureSystem,
      }
    })

    // Log dell'azione (Audit)
    await prisma.auditLog.create({
      data: {
        tenantId: session.user.tenantId!,
        adminId: session.user.id,
        adminName: session.user.name || "Admin",
        action: "UPDATE_PERMISSIONS",
        targetName: updatedUser.name,
        details: `Aggiornati permessi granulari per ${updatedUser.name} (${updatedUser.matricola})`
      }
    })

    return NextResponse.json({ success: true, user: updatedUser })

  } catch (error) {
    console.error("[UPDATE_PERMISSIONS_ERROR]", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
