import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function GET() {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })

  try {
    const groups = await prisma.rotationGroup.findMany({
      include: {
        users: { select: { id: true, name: true, fixedRestDay: true } }
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
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })

  try {
    const { name, pattern, mStartTime, mEndTime, pStartTime, pEndTime, startDate } = await request.json()
    
    const group = await prisma.rotationGroup.create({
      data: { 
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
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })

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
    
    const group = await prisma.rotationGroup.update({ where: { id }, data })
    return NextResponse.json(group)
  } catch (error) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "ID mancante" }, { status: 400 })
    
    await prisma.rotationGroup.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 })
  }
}
