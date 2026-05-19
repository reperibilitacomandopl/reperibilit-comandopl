import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { logAudit, AUDIT_ACTIONS } from "@/lib/audit"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session || !session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { currentPassword, newPassword } = await req.json()

    // Recupera l'utente dal DB
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, password: true, tenantId: true, name: true, forcePasswordChange: true }
    })

    if (!user) {
      return NextResponse.json({ error: "Utente non trovato" }, { status: 404 })
    }

    // C1 FIX: Richiedere e verificare la password attuale (tranne per forcePasswordChange al primo accesso)
    if (!user.forcePasswordChange) {
      if (!currentPassword) {
        return NextResponse.json({ error: "La password attuale è obbligatoria" }, { status: 400 })
      }
      const isCurrentValid = await bcrypt.compare(currentPassword, user.password)
      if (!isCurrentValid) {
        await logAudit({
          tenantId: user.tenantId,
          adminId: user.id,
          adminName: user.name || undefined,
          action: AUDIT_ACTIONS.SYSTEM_CONFIG,
          details: "Tentativo di cambio password fallito: password attuale errata"
        }).catch(() => {})
        return NextResponse.json({ error: "La password attuale non è corretta" }, { status: 403 })
      }
    }

    // Validazione AgID-compliant della nuova password
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/
    if (!newPassword || !passwordRegex.test(newPassword)) {
      return NextResponse.json({ 
        error: "La password deve contenere almeno 8 caratteri, una maiuscola, una minuscola, un numero e un carattere speciale" 
      }, { status: 400 })
    }

    // Impedisce il riutilizzo della stessa password
    const isSamePassword = await bcrypt.compare(newPassword, user.password)
    if (isSamePassword) {
      return NextResponse.json({ error: "La nuova password non può essere uguale a quella attuale" }, { status: 400 })
    }

    const hashed = await bcrypt.hash(newPassword, 12)
    
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        password: hashed,
        forcePasswordChange: false
      }
    })

    await logAudit({
      tenantId: user.tenantId,
      adminId: user.id,
      adminName: user.name || undefined,
      action: AUDIT_ACTIONS.SYSTEM_CONFIG,
      details: "Password modificata con successo"
    }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
