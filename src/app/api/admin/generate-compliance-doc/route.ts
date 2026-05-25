import { NextResponse } from "next/server"
import { auth } from "@/auth"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type") || "dpa"
  const tenantName = session.user.tenantName || "Comando"
  const date = new Date().toLocaleDateString("it-IT")

  // Genera un PDF semplice con i contenuti del documento
  const { jsPDF } = await import("jspdf")

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  doc.setFont("helvetica", "bold")

  const titles: Record<string, string> = {
    dpa: `ACCORDO DI RESPONSABILITÀ DEL TRATTAMENTO DATI\n(Art. 28 GDPR)`,
    registro: `REGISTRO DEI TRATTAMENTI DI DATI PERSONALI\n(Art. 30 GDPR)`,
    dpo: `ATTO DI NOMINA DEL RESPONSABILE\nDELLA PROTEZIONE DEI DATI (DPO)`,
    sla: `SERVICE LEVEL AGREEMENT (SLA)\nAccordo sui Livelli di Servizio`
  }

  doc.setFontSize(14)
  doc.text(titles[type] || "DOCUMENTO DI COMPLIANCE", 20, 30, { maxWidth: 170, align: "center" })

  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")

  const content: Record<string, string> = {
    dpa: `Tra ${tenantName} (Titolare del Trattamento) e Sentinel Security Suite (Responsabile del Trattamento)\n\n` +
      `1. OGGETTO: Il Responsabile tratta dati personali per conto del Titolare nell'ambito del servizio SaaS di gestione operativa Polizia Locale.\n\n` +
      `2. NATURA E FINALITÀ: Gestione turni, presenze, ordini di servizio, timbrature GPS, interventi operativi.\n\n` +
      `3. CATEGORIE DI DATI: Dati anagrafici, matricola, qualifica, dati di contatto, dati GPS, timbrature, documenti.\n\n` +
      `4. DURATA: Per tutta la durata del contratto + periodo di retention legale (10 anni CAD).\n\n` +
      `5. SUB-RESPONSABILI: Oracle Cloud Infrastructure EU (hosting e database PostgreSQL), Upstash Redis EU (se attivo), Telegram/hCaptcha (se attivi). Tutti con DPA/SCC ove richiesto.\n\n` +
      `6. MISURE DI SICUREZZA: Crittografia AES-256-GCM, TLS 1.3, MFA, audit logging, backup cifrati, penetration test periodici.\n\n` +
      `7. DIRITTI INTERESSATI: Il Responsabile assiste il Titolare nel rispondere alle richieste degli interessati (accesso, rettifica, cancellazione).\n\n` +
      `8. NOTIFICA VIOLAZIONI: Il Responsabile notifica al Titolare entro 24 ore dalla scoperta di qualsiasi violazione.\n\n` +
      `Data: ${date}\n\nFirme:\nTitolare: _____________________\nResponsabile: _____________________`,
    registro: `TITOLARE: ${tenantName}\nData aggiornamento: ${date}\n\n` +
      `1. GESTIONE ANAGRAFICA AGENTI: Dati identificativi, matricola, qualifica. Base: esecuzione contratto. Conservazione: 10 anni.\n\n` +
      `2. GESTIONE TURNI E PRESENZE: Orari, assegnazioni, timbrature. Base: obbligo legale. Conservazione: 10 anni.\n\n` +
      `3. GEOLOCALIZZAZIONE: Posizione GPS durante il servizio. Base: consenso esplicito. Conservazione: 1 anno.\n\n` +
      `4. INTERVENTI OPERATIVI: Dati interventi sul campo. Base: esecuzione contratto. Conservazione: 10 anni.\n\n` +
      `5. ORDINI DI SERVIZIO DIGITALI: OdS con firma SHA-256. Base: obbligo legale CAD. Conservazione: permanente.\n\n` +
      `6. NOTIFICHE/CANALI COMUNICAZIONE: Telegram, email, push notification. Base: consenso. Conservazione: 30 giorni.\n\n` +
      `MISURE TECNICHE: Crittografia AES-256, TLS 1.3, autenticazione MFA, RBAC, audit trail, backup giornalieri.`,
    dpo: `${tenantName}\n\n` +
      `NOMINA DEL RESPONSABILE DELLA PROTEZIONE DEI DATI (DPO)\n(Art. 37-39 GDPR)\n\n` +
      `Il Titolare del Trattamento nomina il soggetto sotto indicato quale Responsabile della Protezione dei Dati:\n\n` +
      `Nome DPO: _____________________\nEmail: _____________________\nTelefono: _____________________\n\n` +
      `COMPITI PRINCIPALI:\n- Informare e consigliare Titolare e dipendenti sugli obblighi GDPR\n` +
      `- Sorvegliare l'osservanza del GDPR e delle politiche interne\n- Fornire pareri sulla DPIA\n` +
      `- Cooperare con il Garante Privacy e fungere da punto di contatto\n\n` +
      `Il DPO è coinvolto tempestivamente in tutte le questioni riguardanti la protezione dei dati.\n` +
      `Non riceve istruzioni per quanto riguarda l'esecuzione dei suoi compiti.\n\n` +
      `Data: ${date}\n\nFirma Titolare: _____________________\nFirma DPO: _____________________`,
    sla: `SERVIZIO: Sentinel Security Suite — Piattaforma SaaS per Polizia Locale\n` +
      `FORNITORE: Sentinel Security\nCLIENTE: ${tenantName}\nData: ${date}\n\n` +
      `LIVELLI DI SERVIZIO:\n\n` +
      `CRITICAL (Sistema down):\n- Tempo di risposta: 1 ora\n- Tempo di risoluzione: 4 ore\n- Esempi: applicazione non raggiungibile, database inaccessibile\n\n` +
      `HIGH (Funzione core non disponibile):\n- Tempo di risposta: 4 ore\n- Tempo di risoluzione: 24 ore\n- Esempi: login bloccato, pianificazione turni non funzionante\n\n` +
      `MEDIUM (Funzione non critica degradata):\n- Tempo di risposta: 24 ore\n- Tempo di risoluzione: 72 ore\n- Esempi: export PDF lento, widget meteo non aggiornato\n\n` +
      `DISPONIBILITÀ: 99.5% (tempo di fermo massimo 43.8 ore/anno)\n\n` +
      `BACKUP: Giornaliero con retention 30 giorni + snapshot mensili 1 anno\n\n` +
      `PENALI: Credito del 5% del canone mensile per ogni 0.1% sotto la soglia di disponibilità\n\n` +
      `REFERENTE PA: _____________________\nEmail: _____________________\nTelefono emergenze: _____________________`
  }

  doc.setFontSize(8)
  const lines = doc.splitTextToSize(content[type] || "Documento non disponibile", 170)
  doc.text(lines, 20, 50)

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(6)
    doc.setTextColor(150)
    doc.text(`Sentinel Security Suite — ${type.toUpperCase()} — Generato il ${date}`, 20, 290)
    doc.text(`Pagina ${i} di ${pageCount}`, 190, 290, { align: "right" })
  }

  // Audit log
  try {
    const { logAudit } = await import("@/lib/audit")
    await logAudit({
      tenantId: session.user.tenantId,
      adminId: session.user.id!,
      adminName: session.user.name!,
      action: "GENERATE_COMPLIANCE_DOC",
      details: `Generato documento compliance ${type.toUpperCase()} (DPA/Registro/DPO/SLA) per ${tenantName}`
    })
  } catch (_) {}

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"))
  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${type}-sentinel-${tenantName.toLowerCase().replace(/\s+/g, '-')}.pdf"`
    }
  })
}
