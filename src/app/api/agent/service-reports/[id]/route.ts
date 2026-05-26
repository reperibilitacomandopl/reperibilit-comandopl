import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const { id: reportId } = await params

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tenantId = session.user.tenantId

  try {
    const report = await prisma.serviceReport.findUnique({
      where: { id: reportId },
      include: {
        author: { select: { id: true, name: true, matricola: true } },
        shift: { select: { id: true, date: true, type: true } },
      },
    })

    if (!report || report.tenantId !== tenantId) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 })
    }

    // Fetch linked interventions and accidents by their IDs
    let interventions: any[] = []
    let accidentReports: any[] = []
    if (report.interventionIds.length > 0) {
      interventions = await prisma.intervention.findMany({
        where: { id: { in: report.interventionIds }, tenantId },
        select: { id: true, type: true, address: true, status: true, priority: true },
      })
    }
    if (report.accidentReportIds.length > 0) {
      accidentReports = await prisma.accidentReport.findMany({
        where: { id: { in: report.accidentReportIds }, tenantId },
        select: { id: true, protocolNumber: true, address: true, severity: true, status: true },
      })
    }

    return NextResponse.json({ ...report, interventions, accidentReports })
  } catch (error) {
    console.error("[GET_SERVICE_REPORT_ID_ERROR]", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const { id: reportId } = await params

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tenantId = session.user.tenantId

  try {
    const body = await req.json()
    const { action, ...updateData } = body

    const existing = await prisma.serviceReport.findUnique({
      where: { id: reportId },
    })

    if (!existing || existing.tenantId !== tenantId) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 })
    }

    let newStatus = existing.status

    if (action === "SUBMIT") {
      if (existing.status !== "BOZZA") {
        return NextResponse.json({ error: "Invalid status transition" }, { status: 400 })
      }
      if (!existing.activities || existing.activities.trim().length < 10) {
        return NextResponse.json({ error: "Descrizione attività troppo breve (min 10 caratteri)" }, { status: 400 })
      }
      newStatus = "COMPILATO"
    } else if (action === "MARK_REVIEWED") {
      const isAuthorized = session.user.role === "ADMIN" || session.user.isUfficiale
      if (!isAuthorized) {
        return NextResponse.json({ error: "Solo admin o ufficiali possono revisionare" }, { status: 403 })
      }
      if (existing.status !== "COMPILATO") {
        return NextResponse.json({ error: "Invalid status transition" }, { status: 400 })
      }
      newStatus = "REVISIONATO"
    } else if (action === "APPROVE") {
      const isAuthorized = session.user.role === "ADMIN" || session.user.isUfficiale
      if (!isAuthorized) {
        return NextResponse.json({ error: "Solo admin o ufficiali possono approvare" }, { status: 403 })
      }
      if (existing.status !== "REVISIONATO") {
        return NextResponse.json({ error: "Invalid status transition" }, { status: 400 })
      }
      newStatus = "APPROVATO"
    } else if (action === "REOPEN") {
      if (session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Solo admin possono riaprire" }, { status: 403 })
      }
      if (existing.status !== "APPROVATO") {
        return NextResponse.json({ error: "Invalid status transition" }, { status: 400 })
      }
      if (!body.reason) {
        return NextResponse.json({ error: "Motivazione richiesta per riapertura" }, { status: 400 })
      }
      newStatus = "REVISIONATO"
      await prisma.auditLog.create({
        data: {
          tenantId,
          adminId: session.user.id,
          action: "REOPEN_SERVICE_REPORT",
          targetId: reportId,
          details: `Motivo: ${body.reason}`,
        },
      })
    }

    // Handle updating array fields
    const data: any = { ...updateData }
    if (body.interventionIds !== undefined) data.interventionIds = body.interventionIds
    if (body.accidentReportIds !== undefined) data.accidentReportIds = body.accidentReportIds
    delete data.action
    delete data.reason

    const updated = await prisma.serviceReport.update({
      where: { id: reportId },
      data: { ...data, status: newStatus },
      include: {
        author: { select: { id: true, name: true, matricola: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("[PUT_SERVICE_REPORT_ID_ERROR]", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const { id: reportId } = await params

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tenantId = session.user.tenantId

  try {
    const existing = await prisma.serviceReport.findUnique({
      where: { id: reportId },
    })

    if (!existing || existing.tenantId !== tenantId) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 })
    }

    if (existing.status !== "BOZZA" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Cannot delete report not in BOZZA unless ADMIN" }, { status: 403 })
    }

    await prisma.serviceReport.delete({ where: { id: reportId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[DELETE_SERVICE_REPORT_ID_ERROR]", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
