import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

/**
 * PUT /api/admin/alert-emergency/[id]
 * Segna un'emergenza come risolta/archiviata.
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    
    await prisma.emergencyAlert.update({
      where: { id },
      data: { status: "ACKNOWLEDGED" }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[ALERT RESOLVE ERROR]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
