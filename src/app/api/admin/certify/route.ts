import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { sendTelegramMessage } from "@/lib/telegram"
import { sendPushNotification } from "@/lib/push-notifications"
import { checkRateLimit } from "@/lib/rate-limit"
import { requestTimestamp } from "@/lib/timestamp"
import { signData } from "@/lib/certificate"

export async function POST(req: Request) {
  const session = await auth()

  if (session?.user?.role !== "ADMIN" && !session?.user?.canManageShifts) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { hash, type, metadata } = await req.json()

    // --- RATE LIMITING SPECIFICO ---
    const limitKey = `certify-pdf-${session.user.id}`
    if (!(await checkRateLimit(limitKey, 10, 60 * 60 * 1000))) {
      return NextResponse.json({ error: "Limite orario di certificazione superato (max 10/ora). Riprova più tardi." }, { status: 429 })
    }

    if (!hash || !type) {
      return NextResponse.json({ error: "Missing hash or type" }, { status: 400 })
    }

    // --- TIMESTAMP RFC 3161 ---
    let timestampToken: string | null = null
    let timestampDate: string | null = null
    let tsaUrl: string | null = null

    try {
      const tsResult = await requestTimestamp(hash)
      if (tsResult) {
        timestampToken = tsResult.token
        timestampDate = tsResult.timestamp
        tsaUrl = tsResult.tsaUrl
      }
    } catch (tsErr) {
      console.warn("[Certify] Timestamp non disponibile, si procede senza:", tsErr)
      // Non bloccare la certificazione se il timestamp fallisce
    }

    // --- FIRMA DIGITALE X.509 ---
    let digitalSignature: string | null = null
    let signAlgorithm: string | null = null

    try {
      const signResult = signData(Buffer.from(hash, "hex"))
      if (signResult) {
        digitalSignature = signResult.signature
        signAlgorithm = signResult.algorithm
      }
    } catch (signErr) {
      console.warn("[Certify] Firma digitale non disponibile, si procede senza:", signErr)
    }

    const enrichedMetadata = {
      ...(typeof metadata === "string" ? JSON.parse(metadata) : metadata),
      certifiedAt: new Date().toISOString(),
      certifiedBy: session.user.name || "Admin",
      ...(timestampToken && {
        timestamp: {
          token: timestampToken,
          date: timestampDate,
          tsa: tsaUrl,
          protocol: "RFC3161"
        }
      }),
      ...(digitalSignature && {
        signature: {
          value: digitalSignature,
          algorithm: signAlgorithm,
          standard: "PKCS#7/X.509"
        }
      })
    }

    const doc = await prisma.certifiedDocument.create({
      data: {
        tenantId: session.user.tenantId || null,
        hash,
        type,
        issuerId: session.user.id,
        issuerName: session.user.name || "Admin",
        metadata: JSON.stringify(enrichedMetadata)
      }
    })

    // Step 10: Notifica Telegram agli agenti del giorno
    if (type === "ODS" && session.user.tenantId) {
      try {
        const meta = typeof metadata === "string" ? JSON.parse(metadata) : metadata
        const odsDate = meta?.date || new Date().toISOString().split("T")[0]
        
        // Trova tutti gli agenti con turno in quel giorno
        const shiftsForDay = await prisma.shift.findMany({
          where: {
            tenantId: session.user.tenantId,
            date: { gte: new Date(odsDate + "T00:00:00Z"), lte: new Date(odsDate + "T23:59:59Z") },
            type: { not: null }
          },
          include: { user: { select: { telegramChatId: true, telegramOptIn: true, name: true } } }
        })

        const recipients = shiftsForDay.filter((s: any) => s.user?.telegramChatId && s.user?.telegramOptIn)
        const dateFormatted = new Date(odsDate).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })
        
        for (const shift of recipients) {
          const text = `📋 <b>ORDINE DI SERVIZIO EMESSO</b>\n\n📅 ${dateFormatted}\n🔒 Certificato da: ${session.user.name}\n\n⚠️ Controlla i dettagli del tuo servizio nell'app.`
          await sendTelegramMessage((shift as any).user.telegramChatId, text)
        }

        const slug = session.user.tenantSlug || ""
        const pushUrl = slug ? `/${slug}?view=planning` : "/"
        const notifiedUserIds = new Set<string>()
        for (const shift of shiftsForDay) {
          if (!shift.userId || notifiedUserIds.has(shift.userId)) continue
          notifiedUserIds.add(shift.userId)
          await sendPushNotification(shift.userId, {
            title: "📋 Ordine di Servizio emesso",
            body: `${dateFormatted} — certificato da ${session.user.name || "Comando"}`,
            url: pushUrl,
            type: "ODS",
          })
        }
      } catch (notifyErr) {
        console.error("[Certify] Errore notifica Telegram:", notifyErr)
        // Non bloccare la certificazione per errori di notifica
      }
    }

    return NextResponse.json({ success: true, documentId: doc.id })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "Document already certified" }, { status: 409 })
    }
    console.error("Certify Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const session = await auth()
  
  if (session?.user?.role !== "ADMIN" && !session?.user?.canManageShifts) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { date } = await req.json()

    if (!date) {
      return NextResponse.json({ error: "Data mancante" }, { status: 400 })
    }

    const tenantId = session.user.tenantId

    // Trova il documento certificato per questa data
    const certifiedDoc = await prisma.certifiedDocument.findFirst({
      where: { 
        tenantId: tenantId || null,
        type: "ODS",
        metadata: { contains: date }
      }
    })

    if (!certifiedDoc) {
      return NextResponse.json({ error: "Nessuna certificazione trovata per questa data" }, { status: 404 })
    }

    // Elimina la certificazione
    await prisma.certifiedDocument.delete({
      where: { id: certifiedDoc.id }
    })

    return NextResponse.json({ success: true, message: "Certificazione revocata con successo" })
  } catch (error: any) {
    console.error("Revoke Certify Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
