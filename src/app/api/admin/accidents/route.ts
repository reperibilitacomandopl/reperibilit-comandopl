import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const session = await auth()
  
  const isAuthorized = session?.user?.role === "ADMIN" || session?.user?.isUfficiale;

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tenantId = session.user.tenantId
  const { searchParams } = new URL(req.url)
  
  const status = searchParams.get('status')
  const severity = searchParams.get('severity')
  const fromDate = searchParams.get('fromDate')
  const toDate = searchParams.get('toDate')

  try {
    const whereClause: any = {
      tenantId
    }

    if (status) whereClause.status = status
    if (severity) whereClause.severity = severity
    if (fromDate || toDate) {
      whereClause.date = {}
      if (fromDate) whereClause.date.gte = new Date(fromDate)
      if (toDate) whereClause.date.lte = new Date(toDate)
    }

    const accidents = await prisma.accidentReport.findMany({
      where: whereClause,
      include: {
        vehicles: true,
        people: true,
        reportingOfficer: {
          select: { id: true, name: true, matricola: true }
        }
      },
      orderBy: { date: 'desc' }
    })

    return NextResponse.json(accidents)
  } catch (error) {
    console.error("[GET_ADMIN_ACCIDENTS_ERROR]", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
