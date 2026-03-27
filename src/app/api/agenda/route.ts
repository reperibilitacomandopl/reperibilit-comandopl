import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET: fetch agenda entries for the logged-in user for a given month
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1), 10)
  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()), 10)

  try {
    const entries = await prisma.agendaEntry.findMany({
      where: {
        userId: session.user.id,
        date: {
          gte: new Date(Date.UTC(year, month - 1, 1)),
          lt: new Date(Date.UTC(year, month, 1)),
        }
      },
      orderBy: { date: "asc" }
    })

    return NextResponse.json(entries)
  } catch (error) {
    console.error("[AGENDA GET]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}

// POST: create a new agenda entry
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { date, code, label, hours, note } = await req.json()

    if (!date || !code || !label) {
      return NextResponse.json({ error: "date, code, label required" }, { status: 400 })
    }

    const entry = await prisma.agendaEntry.upsert({
      where: {
        userId_date_code: {
          userId: session.user.id,
          date: new Date(date),
          code
        }
      },
      update: { label, hours: hours || null, note: note || null },
      create: {
        userId: session.user.id,
        date: new Date(date),
        code,
        label,
        hours: hours || null,
        note: note || null,
      }
    })

    return NextResponse.json({ success: true, entry })
  } catch (error) {
    console.error("[AGENDA POST]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}

// DELETE: remove an agenda entry
export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

    // Verify ownership
    const entry = await prisma.agendaEntry.findUnique({ where: { id } })
    if (!entry || entry.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    await prisma.agendaEntry.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[AGENDA DELETE]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
