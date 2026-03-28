import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    if (!session || !session.user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    // 1. Data di oggi a mezzanotte UTC
    const now = new Date()
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

    // 2. Verifica se l'utente è un Ufficiale reperibile oggi
    // (O se ha il permesso ADMIN)
    const isOfficerOnDuty = await prisma.shift.findFirst({
      where: {
        userId: session.user.id,
        date: today,
        user: { isUfficiale: true },
        repType: { not: null }
      }
    })

    const isAdmin = session.user.role === "ADMIN"

    if (!isOfficerOnDuty && !isAdmin) {
      // Potremmo anche controllare se è l'Ufficiale con grado più alto del giorno 
      // se non è lui stesso in REP, ma per ora seguiamo la logica "Ufficiale in turno"
      return NextResponse.json({ error: "Accesso negato. Funzione disponibile solo per l'Ufficiale di servizio." }, { status: 403 })
    }

    // 3. Recupera tutti i reperibili di oggi
    const dutyTeam = await prisma.shift.findMany({
      where: {
        date: today,
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
