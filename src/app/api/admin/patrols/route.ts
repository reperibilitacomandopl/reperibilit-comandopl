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

    const patrols = await prisma.patrolTemplate.findMany({
      where: { ...tf },
      include: {
        members: { select: { id: true, name: true, matricola: true } },
        serviceCategory: true,
        serviceType: true,
        vehicle: true
      },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json({ success: true, patrols })
  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { name, serviceCategoryId, serviceTypeId, vehicleId, preferredShift, memberIds } = await req.json()
    
    if (!name || !memberIds || memberIds.length === 0) {
      return NextResponse.json({ error: "Nome e membri sono obbligatori" }, { status: 400 })
    }

    const tenantId = session.user.tenantId
    const newPatrol = await prisma.patrolTemplate.create({
      data: {
        tenantId: tenantId || null,
        name,
        serviceCategoryId: serviceCategoryId || null,
        serviceTypeId: serviceTypeId || null,
        vehicleId: vehicleId || null,
        preferredShift: preferredShift || "ALL",
        members: {
          connect: memberIds.map((id: string) => ({ id }))
        }
      },
      include: {
        members: { select: { id: true, name: true, matricola: true } },
        serviceCategory: true,
        serviceType: true,
        vehicle: true
      }
    })

    return NextResponse.json({ success: true, patrol: newPatrol })
  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url = new URL(req.url)
  const id = url.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 })

  try {
    const tenantId = session.user.tenantId
    await prisma.patrolTemplate.delete({ 
      where: { id, tenantId: tenantId || null } 
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
