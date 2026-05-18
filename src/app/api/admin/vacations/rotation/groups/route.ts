import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const season = searchParams.get("season") // "SUMMER" | "WINTER"

  try {
    const groups = await prisma.vacationRotationGroup.findMany({
      where: {
        tenantId: session.user.tenantId,
        ...(season ? { season } : {})
      },
      include: {
        basePeriod: true,
        members: {
          select: { id: true, name: true, matricola: true }
        }
      },
      orderBy: { name: "asc" }
    })
    return NextResponse.json({ success: true, groups })
  } catch (error) {
    console.error("[ROTATION_GROUPS_GET]", error)
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
    const { id, name, season, baseYear, basePeriodId, memberIds } = await request.json()

    if (!name || !season || !baseYear || !basePeriodId) {
      return NextResponse.json({ error: "Campi obbligatori mancanti" }, { status: 400 })
    }

    if (id) {
      // Aggiorna
      const group = await prisma.vacationRotationGroup.update({
        where: { id },
        data: {
          name,
          baseYear,
          basePeriodId,
          members: {
            set: memberIds ? memberIds.map((mid: string) => ({ id: mid })) : []
          }
        },
        include: { basePeriod: true, members: true }
      })
      return NextResponse.json({ success: true, group })
    } else {
      // Crea
      const group = await prisma.vacationRotationGroup.create({
        data: {
          tenantId: u.tenantId,
          name,
          season,
          baseYear,
          basePeriodId,
          members: {
            connect: memberIds ? memberIds.map((mid: string) => ({ id: mid })) : []
          }
        },
        include: { basePeriod: true, members: true }
      })
      return NextResponse.json({ success: true, group })
    }
  } catch (error) {
    console.error("[ROTATION_GROUPS_POST]", error)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
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
    await prisma.vacationRotationGroup.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[ROTATION_GROUPS_DELETE]", error)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}
