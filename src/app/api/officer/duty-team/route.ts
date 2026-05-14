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

    // 1. Data di oggi normalizzata al fuso Europe/Rome
    const now = new Date()
    const localDateStr = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Rome' }).format(now)
    const today = new Date(`${localDateStr}T00:00:00.000Z`)

    // 2. Verifica accesso: Admin, Ufficiale o reperibile oggi
    const isAdmin = session.user.role === "ADMIN" || session.user.isSuperAdmin === true || session.user.canManageShifts === true;
    
    // Controlla se l'utente ha un turno OGGI (di qualsiasi tipo: servizio o reperibilità)
    const myShiftToday = await prisma.shift.findFirst({
      where: { userId: session.user.id, date: today }
    })

    const isOnDutyToday = !!myShiftToday;
    const isOfficer = session.user.isUfficiale === true;

    // 3. Recupera tutti i reperibili di oggi per lo stesso tenant
    const dutyTeamShifts = await prisma.shift.findMany({
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
            gradoLivello: true,
            isUfficiale: true
          }
        }
      }
    })

    if (!isAdmin) {
      // Se non è admin, deve essere in servizio oggi per vedere i reperibili
      if (!isOnDutyToday) {
        return NextResponse.json({ error: "Accesso negato. Funzione visibile solo durante il servizio." }, { status: 403 })
      }

      // Se è in servizio ed è un ufficiale, ha accesso completo
      if (isOfficer) {
        // OK
      } else {
        // È un agente semplice. Ha accesso solo se non ci sono ufficiali reperibili 
        // E se lui è il più alto in grado tra i reperibili
        const hasOfficersOnCall = dutyTeamShifts.some(s => s.user.isUfficiale)
        
        if (hasOfficersOnCall) {
          return NextResponse.json({ error: "Accesso riservato all'Ufficiale di servizio." }, { status: 403 })
        }

        // Nessun ufficiale oggi tra i reperibili. L'utente è il più alto tra i presenti?
        if (dutyTeamShifts.length > 0) {
          const sorted = [...dutyTeamShifts].sort((a,b) => (a.user.gradoLivello ?? 99) - (b.user.gradoLivello ?? 99))
          const highestUserId = sorted[0].user.id
          if (session.user.id !== highestUserId) {
             return NextResponse.json({ error: "Accesso negato." }, { status: 403 })
          }
        } else {
           // Nessuno in reperibilità, e l'utente è un agente semplice in servizio normale.
           // Probabilmente non deve vedere il pannello "Reperibili" se è vuoto.
           return NextResponse.json({ error: "Nessun reperibile oggi." }, { status: 403 })
        }
      }
    }

    // Ordina la squadra da restituire per grado
    dutyTeamShifts.sort((a,b) => (a.user.gradoLivello ?? 99) - (b.user.gradoLivello ?? 99))

    return NextResponse.json({ 
      date: today,
      team: dutyTeamShifts.map(s => ({
        ...s.user,
        repType: s.repType
      }))
    })

  } catch (error) {
    console.error("Duty Team API Error:", error)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}
