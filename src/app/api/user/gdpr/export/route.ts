import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET /api/user/gdpr/export — Esportazione portabilità dati (Art. 20 GDPR)
// L'agente può scaricare tutti i propri dati in formato JSON strutturato
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const userId = session.user.id
    const tenantId = session.user.tenantId

    // 1. Dati anagrafici (senza password)
    const userData = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        matricola: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        qualifica: true,
        gradoLivello: true,
        isUfficiale: true,
        squadra: true,
        servizio: true,
        dataAssunzione: true,
        dataDiNascita: true,
        tipoContratto: true,
        hasL104: true,
        hasStudyLeave: true,
        hasParentalLeave: true,
        gpsConsent: true,
        privacyConsent: true,
        gpsAcceptedAt: true,
        privacyAcceptedAt: true,
        twoFactorEnabled: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!userData) {
      return NextResponse.json({ error: "Utente non trovato" }, { status: 404 })
    }

    // 2. Turni di servizio (ultimi 24 mesi)
    const twoYearsAgo = new Date()
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)
    
    const shifts = await prisma.shift.findMany({
      where: { userId, date: { gte: twoYearsAgo } },
      select: {
        date: true,
        type: true,
        repType: true,
        timeRange: true,
        durationHours: true,
        overtimeHours: true,
        serviceDetails: true,
        serviceCategory: { select: { name: true } },
        serviceType: { select: { name: true } }
      },
      orderBy: { date: "desc" }
    })

    // 3. Agenda voci (straordinari, assenze, etc.)
    const agendaEntries = await prisma.agendaEntry.findMany({
      where: { userId, date: { gte: twoYearsAgo } },
      select: {
        date: true,
        code: true,
        label: true,
        hours: true,
        note: true,
        createdAt: true
      },
      orderBy: { date: "desc" }
    })

    // 4. Assenze
    const absences = await prisma.absence.findMany({
      where: { userId },
      select: {
        date: true,
        code: true,
        source: true,
        createdAt: true
      },
      orderBy: { date: "desc" }
    })

    // 5. Richieste congedi/permessi
    const requests = await prisma.agentRequest.findMany({
      where: { userId },
      select: {
        date: true,
        endDate: true,
        code: true,
        notes: true,
        status: true,
        createdAt: true
      },
      orderBy: { createdAt: "desc" }
    })

    // 6. Timbrature (solo ultime, rispettando la retention di 6 mesi)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    
    const clockRecords = await prisma.clockRecord.findMany({
      where: { userId, timestamp: { gte: sixMonthsAgo } },
      select: {
        timestamp: true,
        type: true,
        lat: true,
        lng: true,
        isVerified: true
      },
      orderBy: { timestamp: "desc" }
    })

    // 7. Saldi ferie/permessi
    const balances = await prisma.agentBalance.findMany({
      where: { userId },
      include: {
        details: {
          select: {
            code: true,
            label: true,
            initialValue: true,
            unit: true
          }
        }
      }
    })

    // Componi il pacchetto di esportazione
    const exportData = {
      _meta: {
        format: "GDPR_DATA_EXPORT",
        version: "1.0",
        generatedAt: new Date().toISOString(),
        generatedBy: "Sentinel Security Suite",
        legalBasis: "Art. 20 GDPR — Diritto alla portabilità dei dati",
        description: "Esportazione completa dei dati personali dell'interessato"
      },
      datiAnagrafici: userData,
      turniDiServizio: shifts,
      agendaVoci: agendaEntries,
      assenze: absences,
      richiesteCongedi: requests,
      timbrature: clockRecords,
      saldiFeriePermessi: balances.map((b: any) => ({
        anno: b.year,
        voci: b.details
      }))
    }

    // Log audit dell'esportazione
    const { logAudit } = await import("@/lib/audit")
    await logAudit({
      tenantId: tenantId || "GLOBAL",
      adminId: userId,
      adminName: session.user.name || "Agente",
      action: "GDPR_DATA_EXPORT",
      targetId: userId,
      targetName: session.user.name || undefined,
      details: `Esportazione dati personali (Art. 20 GDPR) da parte dell'interessato`
    })

    // Restituisci come JSON scaricabile
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="dati_personali_${userData.matricola}_${new Date().toISOString().split('T')[0]}.json"`,
        "Cache-Control": "no-store, no-cache, must-revalidate"
      }
    })
  } catch (error) {
    console.error("[GDPR_EXPORT] Errore:", error)
    return NextResponse.json({ error: "Errore durante l'esportazione" }, { status: 500 })
  }
}
