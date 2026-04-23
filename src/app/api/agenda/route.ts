// @ts-nocheck
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
  const tenantId = session.user.tenantId

  try {
    const entries = await prisma.agendaEntry.findMany({
      where: {
        userId: session.user.id,
        tenantId: tenantId || null,
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
    const { date, code, label, hours, note, userId: targetUserId } = await req.json()

    if (!date || !code || !label) {
      return NextResponse.json({ error: "date, code, label required" }, { status: 400 })
    }

    const tenantId = session.user.tenantId
    // Admin può inserire ore per altri operatori
    const isAdmin = session.user.role === "ADMIN" || session.user.canManageShifts
    const effectiveUserId = (isAdmin && targetUserId) ? targetUserId : session.user.id

    const entry = await prisma.agendaEntry.upsert({
      where: {
        userId_date_code_tenantId: {
          userId: effectiveUserId,
          date: new Date(date),
          code,
          tenantId: tenantId || ""
        }
      },
      update: { label, hours: hours || null, note: note || null },
      create: {
        tenantId: tenantId || null,
        userId: effectiveUserId,
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

    const tenantId = session.user.tenantId
    
    // Verify ownership and tenant
    const entry = await prisma.agendaEntry.findFirst({ 
      where: { id, userId: session.user.id, tenantId: tenantId || null } 
    })
    if (!entry) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    await prisma.agendaEntry.delete({ 
      where: { id, tenantId: tenantId || null } 
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[AGENDA DELETE]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
