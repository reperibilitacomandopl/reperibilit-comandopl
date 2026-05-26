import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const session = await auth()
  const isAuthorized = session?.user?.role === "ADMIN" || session?.user?.isUfficiale

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tenantId = session.user.tenantId
  const { searchParams } = new URL(req.url)

  const status = searchParams.get("status")
  const authorId = searchParams.get("authorId")
  const fromDate = searchParams.get("fromDate")
  const toDate = searchParams.get("toDate")

  try {
    const where: any = { tenantId }

    if (status) where.status = status
    if (authorId) where.authorId = authorId
    if (fromDate || toDate) {
      where.reportDate = {}
      if (fromDate) where.reportDate.gte = new Date(fromDate)
      if (toDate) where.reportDate.lte = new Date(toDate)
    }

    const reports = await prisma.serviceReport.findMany({
      where,
      include: {
        author: { select: { id: true, name: true, matricola: true } },
        shift: { select: { id: true, date: true, type: true } },
      },
      orderBy: { reportDate: "desc" },
    })

    return NextResponse.json(reports)
  } catch (error) {
    console.error("[GET_ADMIN_SERVICE_REPORTS_ERROR]", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
