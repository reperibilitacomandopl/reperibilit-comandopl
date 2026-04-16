import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && !session?.user?.canManageUsers) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { assignments } = await req.json() // Array di { userId, categoryId, typeId, label }
    if (!assignments || !Array.isArray(assignments)) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 })
    }

    // Eseguiamo gli aggiornamenti in una transazione
    await prisma.$transaction(
      assignments.map((a: any) =>
        prisma.user.update({
          where: { id: a.userId },
          data: {
            defaultServiceCategoryId: a.categoryId || null,
            defaultServiceTypeId: a.typeId || null,
            servizio: a.label || null
          }
        })
      )
    )

    return NextResponse.json({ success: true, count: assignments.length })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
