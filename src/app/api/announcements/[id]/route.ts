import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// DELETE /api/announcements/[id]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const { id } = await params;

    await prisma.announcement.delete({
      where: {
        id,
        ...(session.user.tenantId ? { tenantId: session.user.tenantId } : {})
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE Announcement error:", error)
    return NextResponse.json({ error: "Errore interno server" }, { status: 500 })
  }
}
