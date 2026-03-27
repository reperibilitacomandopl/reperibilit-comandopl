import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { userId } = await req.json()
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isUfficiale: !user.isUfficiale }
    })

    const { logAudit } = await import("@/lib/audit")
    await logAudit({
      adminId: session.user.id!,
      adminName: session.user.name!,
      action: "TOGGLE_UFFICIALE",
      targetId: userId,
      targetName: user.name,
      details: `${updated.isUfficiale ? 'Assegnata' : 'Rossa'} qualifica di Ufficiale per ${user.name}`
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
