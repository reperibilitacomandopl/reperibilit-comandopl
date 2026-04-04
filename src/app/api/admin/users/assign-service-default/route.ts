import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function PUT(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { userId, serviceCategoryId, serviceTypeId, servizioLabel } = await req.json()
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 })

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        defaultServiceCategoryId: serviceCategoryId || null,
        defaultServiceTypeId: serviceTypeId || null,
        servizio: servizioLabel || null
      }
    })

    return NextResponse.json({ success: true, user: updatedUser })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
