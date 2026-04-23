import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

/**
 * GET: Restituisce il file audio di un SOS come stream binario.
 * Query params: ?notificationId=xxx
 * Questo endpoint serve l'audio come file reale (non data URL),
 * permettendo al browser di riprodurlo correttamente nell'elemento <audio>.
 */
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const notificationId = searchParams.get("notificationId")

    if (!notificationId) {
      return NextResponse.json({ error: "Missing notificationId" }, { status: 400 })
    }

    // Recupera la notifica dal database
    const notification = await (prisma as any).notification.findUnique({
      where: { id: notificationId }
    })

    if (!notification || !notification.metadata) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 })
    }

    // Parsa i metadati
    let metadata: any
    try {
      metadata = typeof notification.metadata === 'string' 
        ? JSON.parse(notification.metadata) 
        : notification.metadata
    } catch {
      return NextResponse.json({ error: "Invalid metadata" }, { status: 500 })
    }

    if (!metadata.audio) {
      return NextResponse.json({ error: "No audio in this notification" }, { status: 404 })
    }

    // Estrai il base64 puro e il mime type dal data URL
    const dataUrlMatch = metadata.audio.match(/^data:([^;]+);base64,(.+)$/)
    
    if (!dataUrlMatch) {
      return NextResponse.json({ error: "Invalid audio format" }, { status: 500 })
    }

    const mimeType = dataUrlMatch[1] // es: audio/webm
    const base64Data = dataUrlMatch[2]
    const buffer = Buffer.from(base64Data, "base64")

    // Restituisci come file audio binario reale
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Length": buffer.length.toString(),
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, max-age=3600",
      }
    })
  } catch (error) {
    console.error("[ALERT-AUDIO GET]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
