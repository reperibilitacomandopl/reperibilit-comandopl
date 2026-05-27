import nodemailer from "nodemailer"
import { prisma } from "@/lib/prisma"

interface SendEmailParams {
  to: string
  subject: string
  body: string
  tenantId?: string
}

export async function sendEmail({ to, subject, body, tenantId }: SendEmailParams) {
  const smtpHost = process.env.SMTP_HOST
  const smtpPort = parseInt(process.env.SMTP_PORT || "587")
  const smtpUser = process.env.SMTP_USER
  const smtpPass = process.env.SMTP_PASS
  const smtpSecure = process.env.SMTP_SECURE === "true"

  if (!smtpHost || !smtpUser || !smtpPass) {
    console.warn("[EMAIL_SENDER] SMTP not configured — email not sent to", to)
    return { success: false, error: "SMTP not configured" }
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    })

    const fromName = process.env.SMTP_FROM_NAME || "Comando Polizia Locale"
    const fromAddress = process.env.SMTP_FROM_ADDRESS || smtpUser

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to,
      subject,
      text: body,
    })

    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error("[EMAIL_SENDER_ERROR]", error)
    return { success: false, error: String(error) }
  }
}

export async function sendPec({ to, subject, body, tenantId }: SendEmailParams) {
  const pecHost = process.env.PEC_HOST || process.env.SMTP_HOST
  const pecPort = parseInt(process.env.PEC_PORT || process.env.SMTP_PORT || "587")
  const pecUser = process.env.PEC_USER || process.env.SMTP_USER
  const pecPass = process.env.PEC_PASS || process.env.SMTP_PASS

  if (!pecHost || !pecUser || !pecPass) {
    console.warn("[PEC_SENDER] PEC not configured — PEC not sent to", to)
    return { success: false, error: "PEC not configured" }
  }

  try {
    const transporter = nodemailer.createTransport({
      host: pecHost,
      port: pecPort,
      secure: process.env.PEC_SECURE === "true",
      auth: {
        user: pecUser,
        pass: pecPass,
      },
    })

    const info = await transporter.sendMail({
      from: `"Comando Polizia Locale - PEC" <${pecUser}>`,
      to,
      subject,
      text: body,
    })

    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error("[PEC_SENDER_ERROR]", error)
    return { success: false, error: String(error) }
  }
}

export async function processEmailQueue() {
  try {
    const pendingEmails = await prisma.accidentEmailLog.findMany({
      where: { status: "PENDING" },
      include: { accidentReport: { select: { tenantId: true } } },
      take: 20,
    })

    for (const emailLog of pendingEmails) {
      const result = await sendEmail({
        to: emailLog.recipient,
        subject: emailLog.subject,
        body: emailLog.body || "",
        tenantId: emailLog.accidentReport.tenantId,
      })

      await prisma.accidentEmailLog.update({
        where: { id: emailLog.id },
        data: {
          status: result.success ? "SENT" : "FAILED",
          errorMessage: result.error || null,
        },
      })
    }

    return { processed: pendingEmails.length }
  } catch (error) {
    console.error("[PROCESS_EMAIL_QUEUE_ERROR]", error)
    return { processed: 0, error: String(error) }
  }
}
