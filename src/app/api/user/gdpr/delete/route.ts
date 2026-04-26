import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// POST /api/user/gdpr/delete — Richiesta cancellazione account (Art. 17 GDPR)
// L'agente richiede la cancellazione dei propri dati personali.
// NB: Non cancelliamo immediatamente per obblighi di legge (PA), ma anonimizziamo.
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const userId = session.user.id
    const tenantId = session.user.tenantId
    const { reason } = await request.json().catch(() => ({ reason: "" }))

    // Verifica che l'utente esista
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, matricola: true, email: true }
    })

    if (!user) {
      return NextResponse.json({ error: "Utente non trovato" }, { status: 404 })
    }

    // ANONIMIZZAZIONE invece di cancellazione diretta
    // Motivo: i turni di servizio della PA devono essere conservati per 5 anni (obbligo legale).
    // Rimuoviamo i dati identificativi ma manteniamo i dati di servizio anonimizzati.

    // 1. Cancella dati GPS (nessun obbligo di retention)
    await prisma.clockRecord.deleteMany({ where: { userId } })

    // 2. Cancella notifiche
    await prisma.notification.deleteMany({ where: { userId } })

    // 3. Cancella push subscriptions
    await prisma.pushSubscription.deleteMany({ where: { userId } })

    // 4. Anonimizza l'utente (mantieni record per integrità referenziale)
    const anonName = `UTENTE_CANCELLATO_${Date.now().toString(36).toUpperCase()}`
    await prisma.user.update({
      where: { id: userId },
      data: {
        name: anonName,
        email: null,
        phone: null,
        password: "DELETED",
        isActive: false,
        dataDiNascita: null,
        dataAssunzione: null,
        scadenzaPatente: null,
        scadenzaPortoArmi: null,
        noteInterne: null,
        telegramChatId: null,
        telegramLinkCode: null,
        telegramLinkExpires: null,
        twoFactorSecret: null,
        twoFactorEnabled: false,
        lastLat: null,
        lastLng: null,
        lastSeenAt: null,
        gpsConsent: false,
        privacyConsent: false
      }
    })

    // 5. Registra la richiesta nell'audit log (obbligo di tracciabilità)
    const { logAudit } = await import("@/lib/audit")
    await logAudit({
      tenantId: tenantId || "GLOBAL",
      adminId: userId,
      adminName: "SISTEMA",
      action: "GDPR_DELETION_REQUEST",
      targetId: userId,
      targetName: user.matricola,
      details: `Richiesta di cancellazione dati (Art. 17 GDPR). Matricola: ${user.matricola}. Motivo: ${reason || "Non specificato"}. Dati anagrafici anonimizzati, dati GPS cancellati. Turni di servizio mantenuti per obbligo legale (5 anni).`
    })

    return NextResponse.json({
      success: true,
      message: "I tuoi dati personali sono stati anonimizzati. I dati di servizio saranno conservati per il periodo minimo previsto dalla legge (5 anni). Verrai disconnesso automaticamente.",
      details: {
        anagraficaAnonimizzata: true,
        gpsCancellato: true,
        notificheCancellate: true,
        turniMantenuti: true,
        motivoConservazione: "Art. 17(3)(b) GDPR — Obbligo legale PA"
      }
    })
  } catch (error) {
    console.error("[GDPR_DELETE] Errore:", error)
    return NextResponse.json({ error: "Errore durante l'elaborazione" }, { status: 500 })
  }
}
