import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 })

  try {
    const groups = await prisma.holidayRotationGroup.findMany({
      where: { tenantId: session.user.tenantId },
      include: {
        members: {
          select: { id: true, name: true, matricola: true }
        }
      },
      orderBy: { orderIndex: "asc" }
    })
    return NextResponse.json({ success: true, groups })
  } catch (error) {
    console.error("[HOLIDAY_ROTATION_GROUPS_GET]", error)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await auth()
  const u = session?.user
  if (!u) return NextResponse.json({ error: "Non autenticato" }, { status: 401 })
  if (u.role !== "ADMIN" && !u.canManageUsers) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 })
  }

  try {
    const { id, name, baseYear, orderIndex, memberIds } = await request.json()

    if (!name || baseYear === undefined || orderIndex === undefined) {
      return NextResponse.json({ error: "Campi obbligatori mancanti" }, { status: 400 })
    }

    if (id) {
      // Aggiorna
      const group = await prisma.holidayRotationGroup.update({
        where: { id },
        data: {
          name,
          baseYear,
          orderIndex,
          members: {
            set: memberIds ? memberIds.map((mid: string) => ({ id: mid })) : []
          }
        },
        include: { members: true }
      })
      return NextResponse.json({ success: true, group })
    } else {
      // Crea
      const group = await prisma.holidayRotationGroup.create({
        data: {
          tenantId: u.tenantId,
          name,
          baseYear,
          orderIndex,
          members: {
            connect: memberIds ? memberIds.map((mid: string) => ({ id: mid })) : []
          }
        },
        include: { members: true }
      })
      return NextResponse.json({ success: true, group })
    }
  } catch (error) {
    console.error("[HOLIDAY_ROTATION_GROUPS_POST]", error)
    return NextResponse.json({ error: "Errore interno o nome gruppo duplicato" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const session = await auth()
  const u = session?.user
  if (!u) return NextResponse.json({ error: "Non autenticato" }, { status: 401 })
  if (u.role !== "ADMIN" && !u.canManageUsers) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id obbligatorio" }, { status: 400 })

  try {
    await prisma.holidayRotationGroup.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[HOLIDAY_ROTATION_GROUPS_DELETE]", error)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}
