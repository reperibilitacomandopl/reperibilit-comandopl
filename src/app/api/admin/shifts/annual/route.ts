import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { isAssenza, formatShiftCode, isMattina, isPomeriggio } from "@/utils/shift-logic"

export async function POST(request: Request) {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  }

  try {
    const { year, groupId } = await request.json()
    if (!year) {
      return NextResponse.json({ error: "Anno mancante" }, { status: 400 })
    }

    // 1. Carica Utenti (tutti o solo un gruppo specifico)
    const users = await prisma.user.findMany({
      where: (groupId && groupId !== "ALL") ? { rotationGroupId: groupId } : { 
        rotationGroupId: { not: null } 
      },
      include: { rotationGroup: true }
    })

    if (users.length === 0) {
      return NextResponse.json({ error: "Nessun agente trovato per la generazione annuale" }, { status: 404 })
    }

    let totalCreatedOrUpdated = 0

    // 2. Itera su ogni utente
    for (const user of users) {
      if (!user.rotationGroup) continue
      
      const group = user.rotationGroup
      let pattern: string[] = []
      try {
        pattern = JSON.parse(group.pattern)
      } catch {
        continue
      }
      if (pattern.length === 0) continue

      const anchor = new Date(group.startDate)
      
      // 3. Itera su tutti i mesi dell'anno
      for (let month = 0; month < 12; month++) {
        const daysInMonth = new Date(year, month + 1, 0).getDate()
        
        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(Date.UTC(year, month, day))
          
          // Allineamento col pattern di 28 giorni
          const diffTime = date.getTime() - anchor.getTime()
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
          const patternIndex = ((diffDays % 28) + 28) % 28
          const pVal = pattern[patternIndex]

          // Verifica se esiste già un turno per proteggere ferie/malattie
          const existing = await prisma.shift.findUnique({
            where: { userId_date: { userId: user.id, date } }
          })

          if (existing && isAssenza(existing.type)) {
            continue // Non sovrascrivere le assenze caricate
          }

          // Calcolo tipo finale (con logica Riposo Fisso se presente)
          let finalType = pVal
          if (user.fixedRestDay !== null && date.getUTCDay() === user.fixedRestDay) {
            // Controlla se ha lavorato la domenica precedente
            const prevSun = new Date(date)
            prevSun.setUTCDate(date.getUTCDate() - (date.getUTCDay() || 7))
            
            const diffSun = prevSun.getTime() - anchor.getTime()
            const daysSun = Math.round(diffSun / (1000 * 60 * 60 * 24))
            const sunIdx = ((daysSun % 28) + 28) % 28
            const sunVal = pattern[sunIdx]
            
            // Se la domenica precedente era lavorativa, metti riposo oggi
            // Nota che sunVal === "M" o "P" è necessario perché nel pattern i turni sono 'M' o 'P'
            if (sunVal === "M" || sunVal === "P" || isMattina(sunVal) || isPomeriggio(sunVal)) {
              finalType = "RP"
            }
          }

          // Formattazione codice e range orario
          let typeToSave = finalType
          if (finalType === "M") typeToSave = formatShiftCode("M", group.mStartTime)
          else if (finalType === "P") typeToSave = formatShiftCode("P", group.pStartTime)

          const timeRange = typeToSave.startsWith("M") 
            ? `${group.mStartTime || "07:00"}-${group.mEndTime || "13:00"}`
            : typeToSave.startsWith("P")
            ? `${group.pStartTime || "13:00"}-${group.pEndTime || "19:00"}`
            : null

          // Upsert nella tabella Shift
          await prisma.shift.upsert({
            where: { userId_date: { userId: user.id, date } },
            update: { 
              type: typeToSave, 
              timeRange,
              // Mantieni integri i dati OdS se già esistenti
            },
            create: {
              userId: user.id,
              date,
              type: typeToSave,
              timeRange
            }
          })
          totalCreatedOrUpdated++
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      count: totalCreatedOrUpdated,
      year: year,
      agentsCount: users.length 
    })

  } catch (error) {
    console.error("[ANNUAL_SHIFT_GEN]", error)
    return NextResponse.json({ error: "Errore durante la generazione annuale" }, { status: 500 })
  }
}
