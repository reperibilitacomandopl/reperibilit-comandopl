import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { generateServiceReportDocx } from "@/utils/docx-generator"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const { id: reportId } = await params
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const tenantId = session.user.tenantId

  try {
    const report = await prisma.serviceReport.findUnique({
      where: { id: reportId },
      include: {
        author: { select: { id: true, name: true, matricola: true, qualifica: true } },
        tenant: { select: { name: true } }
      }
    })

    if (!report || report.tenantId !== tenantId) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 })
    }

    const docxBuffer = await generateServiceReportDocx({
      report, author: report.author, tenantName: report.tenant?.name
    })

    return new NextResponse(docxBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="Relazione_${report.id}.docx"`
      }
    })
  } catch (error) {
    console.error("[GET_SERVICE_REPORT_DOCX_ERROR]", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
