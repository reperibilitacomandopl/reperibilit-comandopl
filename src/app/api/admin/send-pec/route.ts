import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import nodemailer from "nodemailer"

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  }

// @ts-nocheck
  const tenantId = session.user.tenantId

  try {
    const { month, year } = await req.json()

    // 1. Controllo che il mese sia pubblicato, altrimenti evito l'invio
    const pubStatus = await prisma.monthStatus.findUnique({
      where: { month_year_tenantId: { month, year, tenantId: tenantId || "" } }
    })
    
    if (!pubStatus?.isPublished) {
      return NextResponse.json({ error: "Il mese deve essere Pubblicato prima di inviare le PEC" }, { status: 400 })
    }

    // 2. Raccolta Dati: agenti con email valorizzata del tenant
    const agents = await prisma.user.findMany({
      where: { role: "AGENTE", tenantId: tenantId || null },
      select: { id: true, name: true, email: true, isUfficiale: true }
    })

    const emails = agents.map(a => a.email).filter(Boolean) as string[]
    if (emails.length === 0) {
      return NextResponse.json({ error: "Nessun agente dispone di un indirizzo email anagrafato." }, { status: 400 })
    }

    // 3. Raccolta Reperibilità del mese richiesto (filtrato per tenant)
    const shifts = await prisma.shift.findMany({
      where: {
        tenantId: tenantId || null,
        date: {
          gte: new Date(Date.UTC(year, month - 1, 1)),
          lt: new Date(Date.UTC(year, month, 1)),
        },
        repType: { not: null } // Solo Reperibilità
      },
      include: { user: true }
    })

    // 4. Configurazione Transporter (PEC) leggendo dal DB (filtrato per tenant)
    const pecSettings = await prisma.pecSettings.findUnique({ where: { tenantId: tenantId || "" } })
    if (!pecSettings || !pecSettings.user || !pecSettings.pass) {
      return NextResponse.json({ error: "Credenziali PEC non configurate. Vai in Impostazioni → PEC." }, { status: 400 })
    }

    const transporter = nodemailer.createTransport({
      host: pecSettings.host || "smtps.pec.aruba.it",
      port: Number(pecSettings.port) || 465,
      secure: Number(pecSettings.port) === 465,
      auth: {
        user: pecSettings.user,
        pass: pecSettings.pass,
      },
    })

    // 5. Creazione Tabella HTML (semplificata e compatibile per tutti client di posta)
    // Genera l'intestazione dei giorni
    const daysInMonth = new Date(year, month, 0).getDate()
    let tableHeaders = `<th style="border: 1px solid #ddd; padding: 8px;">Personale</th>`
    for (let d = 1; d <= daysInMonth; d++) {
      tableHeaders += `<th style="border: 1px solid #ddd; padding: 8px; width: 25px;">${d}</th>`
    }

    let tableRows = ""
    for (const agent of agents) {
      let row = `<tr><td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">${agent.name} ${agent.isUfficiale ? '(UFF)' : ''}</td>`
      let hasReps = false
      for (let d = 1; d <= daysInMonth; d++) {
        const dDate = new Date(Date.UTC(year, month - 1, d)).toISOString()
        const agentShift = shifts.find(s => s.userId === agent.id && new Date(s.date).toISOString() === dDate)
        
        if (agentShift?.repType && agentShift.repType.includes("REP")) {
          row += `<td style="border: 1px solid #ddd; padding: 4px; background-color: #d1fae5; color: #065f46; font-size: 10px; text-align: center; font-weight: bold;">REP</td>`
          hasReps = true
        } else {
          row += `<td style="border: 1px solid #ddd; padding: 4px; text-align: center; color: #aaa;">-</td>`
        }
      }
      row += `</tr>`
      
      // Aggiungo la riga solo se questo agente ha almeno 1 reperibilità, altrimenti si può decidere di mostrarli tutti.
      tableRows += row
    }
    
    // L'host attuale del server (per generare link assoluti)
    const host = req.headers.get("host") || "localhost:3000"
    const protocol = host.includes("localhost") ? "http" : "https"
    const baseUrl = `${protocol}://${host}`

    const htmlBodyBase = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2 style="color: #1e3a8a;">Prospetto Reperibilità - Mese ${month}/${year}</h2>
        <p>In allegato il quadro generale delle <strong>Reperibilità</strong> per il mese di riferimento. Gli altri turni o assenze non sono riportati, al fine di garantire una chiara leggibilità esclusiva del servizio REP.</p>
        <div style="overflow-x: auto;">
          <table style="border-collapse: collapse; width: 100%; font-size: 12px; margin-top: 20px;">
            <thead>
              <tr style="background-color: #f8fafc;">
                ${tableHeaders}
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>
    `

    // 6. Invio via mail (Singolo per agente, per iniettare il link WebCal)
    let emailSentCount = 0
    for (const agent of agents) {
      if (!agent.email) continue

      // Trova le reperibilità specifiche di questo agente per fare un riepilogo
      const agentShifts = shifts.filter(s => s.userId === agent.id && s.repType && s.repType.includes("REP"))
      
      let personalSummaryHtml = `
        <div style="margin-top: 20px; padding: 15px; border-left: 4px solid #3b82f6; background-color: #eff6ff;">
          <h3 style="color: #1e3a8a; margin-top: 0; font-size: 15px;">🗓️ Il tuo riepilogo Reperibilità</h3>
      `
      
      if (agentShifts.length > 0) {
        personalSummaryHtml += `<p style="font-size: 13px; color: #1e40af; margin-bottom: 10px;">In questo mese ti sono state assegnate <strong>${agentShifts.length}</strong> reperibilità. Ecco l'elenco esatto dei giorni:</p>
        <ul style="font-size: 13px; color: #1e3a8a; line-height: 1.6; padding-left: 20px;">`
        
        // Ordina per data
        agentShifts.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        
        const daysOfWeek = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"]
        for (const shift of agentShifts) {
          const sDate = new Date(shift.date)
          const dayName = daysOfWeek[sDate.getDay()]
          personalSummaryHtml += `<li><strong>${dayName} ${sDate.getDate()}</strong> - Orario: 22:00 / 07:00</li>`
        }
        personalSummaryHtml += `</ul>`
      } else {
        personalSummaryHtml += `<p style="font-size: 13px; color: #1e40af;">Per questo mese <strong>NON</strong> ti sono state assegnate reperibilità.</p>`
      }
      personalSummaryHtml += `</div>`

      const webCalLink = `webcal://${host}/api/calendar/${agent.id}`
      const icsLink = `${baseUrl}/api/calendar/${agent.id}`
      
      const agentHtml = htmlBodyBase + personalSummaryHtml + `
        <div style="margin-top: 30px; padding: 15px; border-radius: 8px; background-color: #f0fdf4; border: 1px solid #bbf7d0;">
          <h3 style="color: #166534; margin-top: 0; font-size: 14px;">📅 Sincronizzazione Calendario Live sul Telefono</h3>
          <p style="font-size: 12px; color: #15803d;">Vuoi ricevere le tue Reperibilità direttamente nel calendario del telefono e vederle aggiornarsi in automatico? Clicca il link dedicato qui sotto:</p>
          <a href="${webCalLink}" style="display: inline-block; padding: 8px 16px; background-color: #16a34a; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 12px; margin-bottom: 5px;">Abbonati al Calendario (iPhone / Mac / Outlook)</a><br/>
          <span style="font-size: 11px; color: #166534;">Oppure, se usi Android/Google Calendar, clicca <a href="${icsLink}">QUI</a> per scaricare il file. Copia e incolla questo URL in "Aggiungi Calendario tramite URL" se vuoi l'autoaggiornamento: <b>${icsLink}</b></span>
        </div>
        
        <p style="margin-top: 30px; font-size: 11px; color: #64748b;">La presente PEC è stata generata in automatico dal Portale Caserma. Non rispondere a questa mail.</p>
      </div>`

      try {
        await transporter.sendMail({
          from: pecSettings.fromAddr || "comando@pec.it",
          to: agent.email,
          subject: `Resoconto Reperibilità - ${month}/${year}`,
          html: agentHtml,
        })
        emailSentCount++
      } catch (childErr) {
        console.error("Non sono riuscito a mandare la mail a: ", agent.email, childErr)
      }
    }

    return NextResponse.json({ success: true, emailSentCount })
  } catch (error) {
    console.error("[CATCH] PEC Error:", error)
    return NextResponse.json({ error: "Impossibile inviare la mail. Controlla le configurazioni SMTP / PEC_USER" }, { status: 500 })
  }
}
