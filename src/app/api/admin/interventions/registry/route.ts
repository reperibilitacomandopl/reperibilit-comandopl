import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id || (session.user.role !== "ADMIN" && !session.user.isSuperAdmin)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tenantId = session.user.tenantId
  const { searchParams } = new URL(req.url)
  
  const from = searchParams.get("from")
  const to = searchParams.get("to")
  const status = searchParams.get("status")
  const priority = searchParams.get("priority")
  const search = searchParams.get("search")

  try {
    const where: any = { tenantId }
    
    if (from || to) {
      where.createdAt = {}
      if (from) where.createdAt.gte = new Date(from)
      if (to) {
        const toDate = new Date(to)
        toDate.setHours(23, 59, 59, 999)
        where.createdAt.lte = toDate
      }
    }
    if (status && status !== "ALL") where.status = status
    if (priority && priority !== "ALL") where.priority = priority
    if (search) {
      where.OR = [
        { address: { contains: search, mode: "insensitive" } },
        { type: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { callerName: { contains: search, mode: "insensitive" } },
      ]
    }

    const interventions = await prisma.intervention.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true, matricola: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 200
    })

    return NextResponse.json(interventions)
  } catch (error) {
    console.error("[REGISTRY_ERROR]", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
