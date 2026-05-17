import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString())

  try {
    const plans = await prisma.vacationPlan.findMany({
      where: { tenantId: session.user.tenantId, year },
      include: { user: { select: { id: true, name: true, matricola: true, squadra: true } } },
      orderBy: [{ period: "asc" }, { startDate: "asc" }]
    })

    // Raggruppa per periodo
    const grouped = { SUMMER: [] as any[], WINTER: [] as any[], EASTER: [] as any[], CHRISTMAS: [] as any[] }
    for (const p of plans) {
      if (grouped[p.period as keyof typeof grouped]) {
        grouped[p.period as keyof typeof grouped].push(p)
      }
    }

    return NextResponse.json({ plans, grouped })
  } catch (error) {
    console.error("[VACATIONS_GET]", error)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await auth()
  const u = session?.user

  // Agenti possono solo creare preferenze, admin possono assegnare
  if (!u) return NextResponse.json({ error: "Non autenticato" }, { status: 401 })

  try {
    const { period, startDate, endDate, notes, userId, status } = await request.json()

    if (!period || !startDate || !endDate) {
      return NextResponse.json({ error: "period, startDate e endDate obbligatori" }, { status: 400 })
    }

    const targetUserId = (u.role === "ADMIN" || u.canManageUsers) ? (userId || u.id) : u.id
    const planStatus = (u.role === "ADMIN" || u.canManageUsers) ? (status || "ASSIGNED") : "PREFERENCE"

    const year = new Date(startDate).getFullYear()

    const plan = await prisma.vacationPlan.upsert({
      where: {
        userId_period_year: {
          userId: targetUserId,
          period,
          year
        }
      },
      update: { startDate: new Date(startDate), endDate: new Date(endDate), notes, status: planStatus },
      create: {
        tenantId: u.tenantId,
        userId: targetUserId,
        year,
        period,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        notes,
        status: planStatus
      }
    })

    return NextResponse.json({ success: true, plan })
  } catch (error) {
    console.error("[VACATIONS_POST]", error)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id obbligatorio" }, { status: 400 })

  await prisma.vacationPlan.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
