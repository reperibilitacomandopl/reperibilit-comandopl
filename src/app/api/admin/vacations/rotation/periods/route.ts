import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const season = searchParams.get("season") // "SUMMER" | "WINTER"

  try {
    const periods = await prisma.vacationRotationPeriod.findMany({
      where: {
        tenantId: session.user.tenantId,
        ...(season ? { season } : {})
      },
      orderBy: { orderIndex: "asc" }
    })
    return NextResponse.json({ success: true, periods })
  } catch (error) {
    console.error("[ROTATION_PERIODS_GET]", error)
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
    const { id, season, name, startDay, startMonth, endDay, endMonth, orderIndex } = await request.json()

    if (!season || !name || startDay === undefined || startMonth === undefined || endDay === undefined || endMonth === undefined || orderIndex === undefined) {
      return NextResponse.json({ error: "Campi obbligatori mancanti" }, { status: 400 })
    }

    if (id) {
      // Aggiorna
      const period = await prisma.vacationRotationPeriod.update({
        where: { id },
        data: { name, startDay, startMonth, endDay, endMonth, orderIndex }
      })
      return NextResponse.json({ success: true, period })
    } else {
      // Crea
      const period = await prisma.vacationRotationPeriod.create({
        data: {
          tenantId: u.tenantId,
          season,
          name,
          startDay,
          startMonth,
          endDay,
          endMonth,
          orderIndex
        }
      })
      return NextResponse.json({ success: true, period })
    }
  } catch (error) {
    console.error("[ROTATION_PERIODS_POST]", error)
    return NextResponse.json({ error: "Errore interno o indice ordine duplicato" }, { status: 500 })
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
    await prisma.vacationRotationPeriod.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[ROTATION_PERIODS_DELETE]", error)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}
