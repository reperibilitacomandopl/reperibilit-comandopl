import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import crypto from "crypto"

export async function POST(req: Request) {
  try {
    const { token, newPassword } = await req.json()

    if (!token || !newPassword) {
      return NextResponse.json({ error: "Token e nuova password sono obbligatori" }, { status: 400 })
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: "La password deve contenere almeno 8 caratteri" }, { status: 400 })
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex')

    // Trova l'utente con questo token e verifica che non sia scaduto
    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: {
          gt: new Date() // Deve essere nel futuro
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: "Link di recupero non valido o scaduto" }, { status: 400 })
    }

    // Hash della nuova password
    const newHashedPassword = await bcrypt.hash(newPassword, 10)

    // Aggiorna l'utente rimuovendo il token e sbloccando l'account in caso fosse bloccato
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: newHashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        failedLoginAttempts: 0,
        lockoutUntil: null,
        lockoutReason: null
      }
    })

    console.log(`[Reset Password] Password resettata con successo per ${user.email}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Reset Password API Error]", error)
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 })
  }
}
