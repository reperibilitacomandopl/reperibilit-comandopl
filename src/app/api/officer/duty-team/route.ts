// @ts-nocheck
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    if (!session || !session.user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const tenantId = session.user.tenantId

    // 1. Data di oggi a mezzanotte UTC
    const now = new Date()
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

    // 2. Verifica se l'utente è un Ufficiale reperibile oggi nel proprio comando
    const isOfficerOnDuty = await prisma.shift.findFirst({
      where: {
        userId: session.user.id,
        date: today,
        tenantId: tenantId || null,
        user: { isUfficiale: true },
        repType: { not: null }
      }
    })

    const isAdmin = session.user.role === "ADMIN"

    if (!isOfficerOnDuty && !isAdmin) {
      return NextResponse.json({ error: "Accesso negato. Funzione disponibile solo per l'Ufficiale di servizio." }, { status: 403 })
    }

    // 3. Recupera tutti i reperibili di oggi per lo stesso tenant
    const dutyTeam = await prisma.shift.findMany({
      where: {
        date: today,
        tenantId: tenantId || null,
        repType: { not: null }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            matricola: true,
            phone: true,
            qualifica: true,
            telegramChatId: true,
            gradoLivello: true
          }
        }
      },
      orderBy: {
        user: { gradoLivello: 'desc' } // Ordina per grado
      }
    })

    return NextResponse.json({ 
      date: today,
      team: dutyTeam.map(s => ({
        ...s.user,
        repType: s.repType
      }))
    })

  } catch (error) {
    console.error("Duty Team API Error:", error)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}
