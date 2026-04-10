import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  const session = await auth()
  
  if (!session?.user || (session.user.role !== "ADMIN" && !session.user.isSuperAdmin)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get("limit") || "50")
  const skip = parseInt(searchParams.get("skip") || "0")

  try {
    const logs = await prisma.auditLog.findMany({
      where: {
        tenantId: session.user.tenantId || "N0T-EX1ST1NG"
      },
      orderBy: {
        createdAt: "desc"
      },
      take: limit,
      skip: skip
    })

    const total = await prisma.auditLog.count({
      where: {
        tenantId: session.user.tenantId || "N0T-EX1ST1NG"
      }
    })

    return NextResponse.json({ logs, total })
  } catch (error) {
    console.error("Errore fetch audit logs:", error)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}
