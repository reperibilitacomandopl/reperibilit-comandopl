import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const [users, categories] = await Promise.all([
      prisma.user.findMany({
        where: { role: "AGENTE" },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          isUfficiale: true,
          servizio: true, // "Polizia Edilizia" testuale
          defaultServiceCategoryId: true,
          defaultServiceTypeId: true
        }
      }),
      prisma.serviceCategory.findMany({
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
