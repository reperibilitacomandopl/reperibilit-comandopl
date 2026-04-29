import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { sendTelegramMessage } from "@/lib/telegram"

export async function POST(req: Request) {
  const session = await auth()
  
  if (session?.user?.role !== "ADMIN" && !session?.user?.canManageShifts) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { hash, type, metadata } = await req.json()

    if (!hash || !type) {
      return NextResponse.json({ error: "Missing hash or type" }, { status: 400 })
    }

    const doc = await prisma.certifiedDocument.create({
      data: {
        tenantId: session.user.tenantId || null,
        hash,
        type,
        issuerId: session.user.id,
        issuerName: session.user.name || "Admin",
        metadata: JSON.stringify(metadata)
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
