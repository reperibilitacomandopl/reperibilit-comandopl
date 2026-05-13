import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { OTP } from "otplib"
import { encrypt, decrypt } from "@/lib/crypto"
import QRCode from "qrcode"
import crypto from "crypto"
import bcrypt from "bcryptjs"

const otp = new OTP({ strategy: 'totp' });

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
    let secret = user.twoFactorSecret ? decrypt(user.twoFactorSecret) : null
    
    if (!secret) {
      secret = otp.generateSecret()
      await prisma.user.update({
        where: { id: user.id },
        data: { twoFactorSecret: encrypt(secret) }
      })
    }

    const otpauth = otp.generateURI({
      issuer: "Sentinel Security",
      label: user.matricola,
      secret: secret
    })

    const qrCodeUrl = await QRCode.toDataURL(otpauth)

    return NextResponse.json({ 
      qrCode: qrCodeUrl,
      secret: secret,
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
      const result = await otp.verify({
        token,
        secret: user.twoFactorSecret
      })

      if (!result.valid) {
        return NextResponse.json({ error: "Codice non valido" }, { status: 400 })
      }

      const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1"
      const updatedIps = Array.from(new Set([...(user.trustedIps || []), ip]))

      // 4. Genera Codici di Backup (Punto 2.3 - Backup Codes)
      const backupCodes = Array.from({ length: 8 }, () => crypto.randomBytes(4).toString('hex').toUpperCase())
      const hashedBackupCodes = await Promise.all(backupCodes.map(code => bcrypt.hash(code, 10)))

      await prisma.user.update({
        where: { id: user.id },
        data: { 
          twoFactorEnabled: true,
          trustedIps: updatedIps,
          twoFactorBackupCodes: hashedBackupCodes
        }
      })

      return NextResponse.json({ 
        success: true, 
        enabled: true,
        backupCodes // Restituiti SOLO ora all'utente
      })
    }

    if (action === "disable") {
      // Per disabilitare chiediamo comunque il token per sicurezza
      const result = await otp.verify({
        token,
        secret: user.twoFactorSecret
      })

      if (!result.valid) {
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
