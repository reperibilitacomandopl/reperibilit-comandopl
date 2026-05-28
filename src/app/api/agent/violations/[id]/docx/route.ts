import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { generateViolationDocx } from "@/utils/docx-generator"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const { id: violationId } = await params
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const tenantId = session.user.tenantId

  try {
    const violation = await prisma.violation.findUnique({
      where: { id: violationId },
      include: { tenant: { select: { name: true } } }
    })

    if (!violation || violation.tenantId !== tenantId) {
      return NextResponse.json({ error: "Violation not found" }, { status: 404 })
    }

    const docxBuffer = await generateViolationDocx({
      violation, tenantName: violation.tenant?.name
    })

    return new NextResponse(docxBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="Verbale_${violation.id}.docx"`
      }
    })
  } catch (error) {
    console.error("[GET_VIOLATION_DOCX_ERROR]", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
