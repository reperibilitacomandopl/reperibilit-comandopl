import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { accidentSendEmailSchema } from "@/lib/validations/accident"
import { z } from "zod"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const { id: accidentId } = await params

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tenantId = session.user.tenantId

  try {
    const json = await req.json()
    const body = accidentSendEmailSchema.parse(json)

    const accident = await prisma.accidentReport.findUnique({
      where: { id: accidentId },
      select: { id: true, tenantId: true, protocolNumber: true, date: true, address: true }
    })

    if (!accident || accident.tenantId !== tenantId) {
      return NextResponse.json({ error: "Accident not found" }, { status: 404 })
    }

    const results = []

    for (const recipient of body.recipients) {
      const subject = body.subject ||
        `Sinistro stradale ${accident.protocolNumber} — Comando Polizia Locale`

      const defaultBody = [
        `Gentile ${recipient.name || "Cittadino/a"},`,
        "",
        `Con la presente si comunica che in data ${new Date(accident.date).toLocaleDateString("it-IT")}`,
        `si è verificato un sinistro stradale in ${accident.address}.`,
        "",
        `Numero protocollo: ${accident.protocolNumber}`,
        "",
        body.customMessage || "Per ulteriori informazioni o per ritirare copia degli atti, rivolgersi all'Ufficio Infortunistica del Comando.",
        "",
        "Cordiali saluti,",
        "Comando Polizia Locale"
      ].join("\n")

      const log = await prisma.accidentEmailLog.create({
        data: {
          accidentReportId: accidentId,
          sentAt: new Date(),
          recipient: recipient.email,
          recipientType: recipient.recipientType,
          subject,
          body: defaultBody,
          status: "PENDING",
        }
      })

      // Note: actual email sending is deferred to the email sender
      // infrastructure. See src/lib/email-sender.ts for SMTP configuration.
      results.push({
        id: log.id,
        recipient: recipient.email,
        status: "PENDING"
      })
    }

    await prisma.accidentAuditLog.create({
      data: {
        accidentReportId: accidentId,
        userId: session.user.id,
        action: "EMAIL_SENT",
        details: `${results.length} email in coda di invio`
      }
    })

    return NextResponse.json({
      message: `${results.length} email messe in coda di invio`,
      results
    })
  } catch (error) {
    console.error("[SEND_EMAIL_ERROR]", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: (error as any).errors }, { status: 400 })
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
