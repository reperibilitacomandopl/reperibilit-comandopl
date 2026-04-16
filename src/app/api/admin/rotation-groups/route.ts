// @ts-nocheck
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function GET() {
  const session = await auth()
  if (!session?.user || (session.user.role !== "ADMIN" && !session?.user?.canManageShifts)) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })

  try {
    const tenantId = session.user.tenantId
    const tf = tenantId ? { tenantId } : {}

    const groups = await prisma.rotationGroup.findMany({
      where: { ...tf },
      include: {
        users: { 
          where: { isActive: true },
          select: { id: true, name: true, fixedRestDay: true } 
        }
      },
      orderBy: { name: 'asc' }
    })
    return NextResponse.json(groups)
  } catch (error) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user || (session.user.role !== "ADMIN" && !session?.user?.canManageShifts)) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })

  try {
    const { name, pattern, mStartTime, mEndTime, pStartTime, pEndTime, startDate } = await request.json()
    const tenantId = session.user.tenantId
    
    const group = await prisma.rotationGroup.create({
      data: { 
        tenantId: tenantId || null,
        name, 
        pattern: JSON.stringify(pattern),
        ...(mStartTime && { mStartTime }),
        ...(mEndTime && { mEndTime }),
        ...(pStartTime && { pStartTime }),
        ...(pEndTime && { pEndTime }),
        ...(startDate && { startDate: new Date(startDate) }),
      }
    })
    return NextResponse.json(group)
  } catch (error) {
    return NextResponse.json({ error: "Creation failed" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const session = await auth()
  if (!session?.user || (session.user.role !== "ADMIN" && !session?.user?.canManageShifts)) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })

  try {
    const { id, name, pattern, mStartTime, mEndTime, pStartTime, pEndTime, startDate } = await request.json()
    const data: any = {}
    if (name !== undefined) data.name = name
    if (pattern !== undefined) data.pattern = JSON.stringify(pattern)
    if (mStartTime !== undefined) data.mStartTime = mStartTime
    if (mEndTime !== undefined) data.mEndTime = mEndTime
    if (pStartTime !== undefined) data.pStartTime = pStartTime
    if (pEndTime !== undefined) data.pEndTime = pEndTime
    if (startDate !== undefined) data.startDate = new Date(startDate)
    
    const tenantId = session.user.tenantId
    
    const group = await prisma.rotationGroup.update({ 
      where: { id, tenantId: tenantId || null }, 
      data 
    })
    return NextResponse.json(group)
  } catch (error) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const session = await auth()
  if (!session?.user || (session.user.role !== "ADMIN" && !session?.user?.canManageShifts)) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "ID mancante" }, { status: 400 })

    const tenantId = session.user.tenantId
    
    await prisma.rotationGroup.delete({ 
      where: { id, tenantId: tenantId || null } 
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 })
  }
}
