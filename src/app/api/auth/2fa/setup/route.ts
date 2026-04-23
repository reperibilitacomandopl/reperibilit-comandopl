import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { authenticator } from "otplib"
import QRCode from "qrcode"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Generate secret if not exists
    let secret = user.twoFactorSecret
    if (!secret) {
      secret = authenticator.generateSecret()
      await prisma.user.update({
        where: { id: user.id },
        data: { twoFactorSecret: secret }
      })
    }

    const otpauth = authenticator.keyuri(
      user.matricola,
      "Sentinel Security",
      secret
    )

    const qrCodeUrl = await QRCode.toDataURL(otpauth)

    return NextResponse.json({ 
      secret, 
      qrCodeUrl,
      enabled: user.twoFactorEnabled 
    })
  } catch (error) {
    console.error("[2FA SETUP ERROR]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { token, action } = await req.json()
    
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user || !user.twoFactorSecret) {
      return NextResponse.json({ error: "Setup not initialized" }, { status: 400 })
    }

    if (action === "enable") {
      const isValid = authenticator.verify({
        token,
        secret: user.twoFactorSecret
      })

      if (!isValid) {
        return NextResponse.json({ error: "Codice non valido" }, { status: 400 })
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { twoFactorEnabled: true }
      })

      return NextResponse.json({ success: true, enabled: true })
    }

    if (action === "disable") {
      // Per disabilitare chiediamo comunque il token per sicurezza
      const isValid = authenticator.verify({
        token,
        secret: user.twoFactorSecret
      })

      if (!isValid) {
        return NextResponse.json({ error: "Codice non valido" }, { status: 400 })
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { twoFactorEnabled: false, twoFactorSecret: null }
      })

      return NextResponse.json({ success: true, enabled: false })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("[2FA ENABLE ERROR]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
