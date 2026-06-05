import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })

    const users = await prisma.user.findMany({
      where: { tenantId: session.user.tenantId, active: true },
      select: { id: true, name: true, cognome: true, nome: true, matricola: true },
      orderBy: [{ cognome: "asc" }, { name: "asc" }]
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error("GET /api/agent/users error:", error)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}
