import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && !session?.user?.canManageUsers) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const tenantId = session.user.tenantId
    const tf = tenantId ? { tenantId } : {}

    const trainingRecords = await (prisma as any).trainingRecord.findMany({
      where: tf,
      include: {
        user: { select: { id: true, name: true, matricola: true } }
      },
      orderBy: { expiryDate: 'asc' }
    })

    return NextResponse.json({ success: true, trainingRecords })
  } catch (error: any) {
    console.error("[TRAINING GET ERROR]", error)
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && !session?.user?.canManageUsers) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const tenantId = session.user.tenantId

    const newRecord = await (prisma as any).trainingRecord.create({
      data: {
        ...body,
        tenantId: tenantId || null,
        issueDate: new Date(body.issueDate),
        expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
      }
    })

    return NextResponse.json({ success: true, record: newRecord })
  } catch (error: any) {
    console.error("[TRAINING POST ERROR]", error)
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 })
  }
}
