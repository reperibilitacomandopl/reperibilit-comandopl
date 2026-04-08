// @ts-nocheck
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && !session?.user?.canConfigureSystem) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const tenantId = session.user.tenantId
    const tf = tenantId ? { tenantId } : {}

    const [users, categories] = await Promise.all([
      prisma.user.findMany({
        where: { role: "AGENTE", ...tf },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          isUfficiale: true,
          servizio: true,
          defaultServiceCategoryId: true,
          defaultServiceTypeId: true
        }
      }),
      prisma.serviceCategory.findMany({
        where: { ...tf },
        include: { types: true },
        orderBy: { orderIndex: "asc" }
      })
    ])

    return NextResponse.json({ users, categories })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
