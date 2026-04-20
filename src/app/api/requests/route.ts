import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { getLabel, PERMESSI_104_CODES, CONGEDO_CODES } from '@/utils/agenda-codes'
import { getEntitlementStatus } from '@/lib/entitlements'

export async function POST(req: Request) {
  const session = await auth()
  
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { date, endDate, code, notes, startTime, endTime, hours } = body

    if (!date || !code) {
      return NextResponse.json({ error: "Data e causale obbligatori" }, { status: 400 })
    }

    const tenantId = session.user.tenantId

    const existing = await prisma.agentRequest.findFirst({
      where: {
        userId: session.user.id,
        date: new Date(date),
        status: "PENDING",
        tenantId: tenantId || null
      }
    })

    if (existing) {
      return NextResponse.json({ error: "Hai già una richiesta in attesa per questa data." }, { status: 400 })
    }

    // --- VALIDAZIONE DIRITTI & BUDGET ---
    const reqDate = new Date(date)
    const month = reqDate.getMonth() + 1
    const year = reqDate.getFullYear()
    
    const status = await getEntitlementStatus(session.user.id, month, year)
    
    // 1. Controllo Abilitazione Flag
    if (PERMESSI_104_CODES.includes(code) && !status.hasL104) {
      return NextResponse.json({ error: "Non sei abilitato alla Legge 104. Contatta l'ufficio personale." }, { status: 403 })
    }
    if (code === "0150" && !status.hasStudyLeave) {
      return NextResponse.json({ error: "Non sei abilitato al Diritto allo Studio (150H)." }, { status: 403 })
    }
    if (CONGEDO_CODES.includes(code) && !status.hasParentalLeave) {
      return NextResponse.json({ error: "Non sei abilitato ai Congedi Parentali." }, { status: 403 })
    }
    if (code === "0018" && !status.hasChildSicknessLeave) {
      return NextResponse.json({ error: "Non sei abilitato alla Malattia Figlio." }, { status: 403 })
    }

    // 2. Controllo Budget Residuo (Throttling)
    if (PERMESSI_104_CODES.includes(code)) {
      const isHourly = code.endsWith('H')
      const currentMode = status.l104Mode === "NONE" ? (isHourly ? "HOURS" : "DAYS") : status.l104Mode
      
      // Controllo Sticky Mode: se il mese è già iniziato con una modalità, non puoi cambiare
      if (status.l104Mode !== "NONE" && ((isHourly && status.l104Mode === "DAYS") || (!isHourly && status.l104Mode === "HOURS"))) {
         return NextResponse.json({ 
           error: `Causale non valida per questo mese. Per il mese di ${reqDate.toLocaleString('it-IT', { month: 'long' })} hai già utilizzato la 104 in ${status.l104Mode === 'DAYS' ? 'GIORNI' : 'ORE'}.` 
         }, { status: 400 })
      }

      // Calcolo quantità richiesta
      let requested = 0
      if (!isHourly) {
        const start = new Date(date)
        const end = endDate ? new Date(endDate) : start
        requested = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
      } else {
        requested = parseFloat(hours) || 0
      }

      if (status.l104Used + requested > status.l104Limit) {
        return NextResponse.json({ 
          error: `Contatore L.104 esaurito. Disponibili: ${status.l104Limit - status.l104Used} ${currentMode === 'DAYS' ? 'gg' : 'h'}. Richiesti: ${requested}.` 
        }, { status: 400 })
      }
    }

    if (code === "0150") {
      const requested = parseFloat(hours) || 0
      if (status.studyLeaveUsed + requested > status.studyLeaveLimit) {
        return NextResponse.json({ 
          error: `Contatore Diritto allo Studio (150H) esaurito per l'anno corrente. Residuo: ${status.studyLeaveLimit - status.studyLeaveUsed}h.` 
        }, { status: 400 })
      }
    }

    const request = await prisma.agentRequest.create({
      data: {
        tenantId: tenantId || null,
        userId: session.user.id,
        date: new Date(date),
        endDate: endDate ? new Date(endDate) : null,
        startTime: startTime || null,
        endTime: endTime || null,
        hours: hours ? parseFloat(hours) : null,
        code,
        notes,
        status: "PENDING"
      }
    })

    // --- NOTIFICA PER GLI ADMIN ---
    try {
      const admins = await prisma.user.findMany({
        where: { 
          tenantId: tenantId || null,
          role: "ADMIN"
        },
        select: { id: true }
      })

      if (admins.length > 0) {
        const label = getLabel(code)
        const startStr = new Date(date).toLocaleDateString("it-IT")
        const periodStr = endDate 
          ? `dal ${startStr} al ${new Date(endDate).toLocaleDateString("it-IT")}` 
          : `per il ${startStr}`

        await (prisma as any).notification.createMany({
          data: admins.map(admin => ({
            tenantId: tenantId || null,
            userId: admin.id,
            title: "Nuova Richiesta",
            message: `${session.user.name} ha richiesto ${label} ${periodStr}.`,
            type: "REQUEST",
            link: `/admin/richieste`,
            metadata: JSON.stringify({ requestId: request.id })
          }))
        })
      }
    } catch (notifyError) {
      console.error("Error creating notification for admins:", notifyError)
    }

    return NextResponse.json({ success: true, request })

  } catch (error: any) {
    console.error("Error creating request:", error)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}
