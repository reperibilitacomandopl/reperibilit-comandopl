// @ts-nocheck
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const tenantId = session.user.tenantId
    const tf = tenantId ? { tenantId } : {}

    const categories = await prisma.serviceCategory.findMany({
      where: { ...tf },
      include: { types: true },
      orderBy: { orderIndex: "asc" }
    })
    return NextResponse.json({ categories })
  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { action } = body

    const tenantId = session.user.tenantId

    if (action === "createCategory") {
      const category = await prisma.serviceCategory.create({ 
        data: { name: body.name, tenantId: tenantId || null } 
      })
      return NextResponse.json({ category })
    }

    if (action === "createType") {
      const type = await prisma.serviceType.create({ 
        data: { 
          name: body.name, 
          categoryId: body.categoryId, 
          tenantId: tenantId || null 
        } 
      })
      return NextResponse.json({ type })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get("type")
    const id = searchParams.get("id")

    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 })

    const tenantId = session.user.tenantId

    if (type === "category") {
      await prisma.serviceCategory.delete({ 
        where: { id, tenantId: tenantId || null } 
      })
    } else if (type === "serviceType") {
      await prisma.serviceType.delete({ 
        where: { id, tenantId: tenantId || null } 
      })
    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
