import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { OTP } from "otplib"
import { decrypt } from "@/lib/crypto"
import { logAudit, AUDIT_ACTIONS } from "@/lib/audit"
import bcrypt from "bcryptjs"

const otp = new OTP({ strategy: 'totp' });

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { token } = await req.json()

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, tenantId: true, twoFactorSecret: true, twoFactorBackupCodes: true, trustedIps: true }
    })

    if (!user || !user.twoFactorSecret) {
      return NextResponse.json({ error: "2FA non configurato" }, { status: 400 })
    }

    let isValid = false
    let isBackupUsed = false

    // 1. Prova con il token TOTP normale
    const result = await otp.verify({
      token,
      secret: decrypt(user.twoFactorSecret)
    })
    isValid = result.valid

    // 2. Se fallisce, prova con i codici di backup
    if (!isValid && user.twoFactorBackupCodes.length > 0) {
      for (const hashedCode of user.twoFactorBackupCodes) {
        const match = await bcrypt.compare(token.toUpperCase(), hashedCode)
        if (match) {
          isValid = true
          isBackupUsed = true
          // Rimuovi il codice usato
          await prisma.user.update({
            where: { id: user.id },
            data: {
              twoFactorBackupCodes: {
                set: user.twoFactorBackupCodes.filter((c: string) => c !== hashedCode)
              }
            }
          })
          break
        }
      }
    }

    if (!isValid) {
      // Log MFA failure
      try {
        await logAudit({
          tenantId: user.tenantId,
          adminId: user.id,
          adminName: user.name || undefined,
          action: AUDIT_ACTIONS.LOGIN_FAILED,
          details: isBackupUsed ? "Verifica 2FA fallita (backup code invalido)" : "Verifica 2FA fallita (codice TOTP non valido)"
        })
      } catch (_) { /* non bloccare per log */ }
      return NextResponse.json({ error: "Codice non valido" }, { status: 400 })
    }

    // Aggiungi l'IP attuale ai trusted IPs
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1"
    const updatedIps = Array.from(new Set([...(user.trustedIps || []), ip]))

    await prisma.user.update({
      where: { id: user.id },
      data: { trustedIps: updatedIps }
    })

    // Log MFA success
    try {
      await logAudit({
        tenantId: user.tenantId,
        adminId: user.id,
        adminName: user.name || undefined,
        action: AUDIT_ACTIONS.LOGIN,
        details: isBackupUsed
          ? "Verifica 2FA riuscita con backup code"
          : "Verifica 2FA riuscita con TOTP"
      })
    } catch (_) { /* non bloccare per log */ }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[2FA VERIFY ERROR]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
