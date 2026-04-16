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
    const isAdmin = session.user.role === "ADMIN"
    
    // Controlla se l'utente è un ufficiale (anche non in reperibilità oggi)
    const userRecord = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isUfficiale: true }
    })

    const isOfficer = userRecord?.isUfficiale === true

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

    const hasOfficersOnCall = dutyTeamShifts.some(s => s.user.isUfficiale)
    let isHighestRankingOnCall = false;

    if (!isOfficer && !isAdmin) {
      // Se c'è un ufficiale in turno, gli agenti normali non hanno accesso
      if (hasOfficersOnCall) {
        return NextResponse.json({ error: "Accesso negato. Funzione disponibile solo per l'Ufficiale di servizio." }, { status: 403 })
      }
      
      // Nessun ufficiale oggi. L'agente è in reperibilità oggi?
      const isOnCallToday = dutyTeamShifts.some(s => s.user.id === session.user.id)
      if (!isOnCallToday) {
         return NextResponse.json({ error: "Accesso negato." }, { status: 403 })
      }

      // Ordiniamo per trovare il più alto in grado (gradoLivello minore)
      if (dutyTeamShifts.length > 0) {
        const sorted = [...dutyTeamShifts].sort((a,b) => (a.user.gradoLivello ?? 99) - (b.user.gradoLivello ?? 99))
        const highestUserId = sorted[0].user.id
        if (session.user.id === highestUserId) {
           isHighestRankingOnCall = true
        }
      }

      if (!isHighestRankingOnCall) {
         return NextResponse.json({ error: "Accesso negato." }, { status: 403 })
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
