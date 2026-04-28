import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && !session?.user?.canManageUsers) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await req.json()
    const tenantId = session.user.tenantId

    const updatedRecord = await (prisma as any).trainingRecord.update({
      where: { 
        id,
        tenantId: tenantId || null
      },
      data: {
        ...body,
        issueDate: body.issueDate ? new Date(body.issueDate) : undefined,
        expiryDate: body.expiryDate !== undefined ? (body.expiryDate ? new Date(body.expiryDate) : null) : undefined,
      }
    })

    return NextResponse.json({ success: true, record: updatedRecord })
  } catch (error: any) {
    console.error("[TRAINING PUT ERROR]", error)
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && !session?.user?.canManageUsers) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const tenantId = session.user.tenantId

    await (prisma as any).trainingRecord.delete({
      where: { 
        id,
        tenantId: tenantId || null
      }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[TRAINING DELETE ERROR]", error)
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 })
  }
}
