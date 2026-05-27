import jsPDF from "jspdf"
import "jspdf-autotable"
import { format } from "date-fns"
import { it } from "date-fns/locale"

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: import("jspdf-autotable").UserOptions) => jsPDF;
  lastAutoTable: { finalY: number };
  internal: any;
}

const NAVY: [number, number, number] = [0, 23, 54]
const TITLE: [number, number, number] = [15, 23, 42]
const GREY: [number, number, number] = [100, 100, 100]
const DARK: [number, number, number] = [50, 50, 50]

function checkPageBreak(doc: jsPDFWithAutoTable, y: number, threshold = 250) {
  if (y > threshold) {
    doc.addPage()
    return 20
  }
  return y
}

function sectionHeader(doc: jsPDFWithAutoTable, num: string, title: string, y: number): number {
  y = checkPageBreak(doc, y)
  doc.setFontSize(12)
  doc.setTextColor(...TITLE)
  doc.setFont("helvetica", "bold")
  doc.text(`${num}. ${title}`, 14, y)
  return y + 7
}

function sectionBody(doc: jsPDFWithAutoTable, y: number): number {
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(...DARK)
  return y
}

export async function generateAccidentReportPDF({
  accident,
  tenantName = "Comando Polizia Locale"
}: {
  accident: any;
  tenantName?: string;
}) {
  const doc = new jsPDF() as jsPDFWithAutoTable

  // ── Header ──
  doc.setFontSize(20)
  doc.setTextColor(...NAVY)
  doc.setFont("helvetica", "bold")
  doc.text(`POLIZIA LOCALE - ${tenantName.toUpperCase()}`, 105, 20, { align: "center" })

  doc.setFontSize(14)
  doc.text("RAPPORTO DI INCIDENTE STRADALE", 105, 28, { align: "center" })

  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(...GREY)
  const genDate = format(new Date(), "dd/MM/yyyy HH:mm")
  doc.text(`Protocollo: ${accident.protocolNumber || "Bozza"} - Generato il ${genDate}`, 105, 34, { align: "center" })

  doc.setDrawColor(...NAVY)
  doc.setLineWidth(0.5)
  doc.line(14, 38, 196, 38)

  let y = 48

  // ── 1. DATI GENERALI ──
  y = sectionHeader(doc, "1", "DATI GENERALI", y)
  y = sectionBody(doc, y)

  const formattedDate = accident.date
    ? format(new Date(accident.date), "dd MMMM yyyy 'alle ore' HH:mm", { locale: it })
    : "N/D"

  doc.text(`Data e Ora: ${formattedDate}`, 14, y); y += 6
  doc.text(`Luogo: ${accident.address}`, 14, y); y += 6
  if (accident.locationNotes) { doc.text(`Note posizione: ${accident.locationNotes}`, 14, y); y += 6 }
  doc.text(`Coordinate GPS: ${accident.lat || "N/D"}, ${accident.lng || "N/D"}`, 14, y); y += 6
  doc.text(`Gravità: ${(accident.severity || "").replace(/_/g, " ")}`, 14, y); y += 6
  doc.text(`Condizioni Meteo: ${accident.weatherCondition || "N/D"}`, 105, 48 + 1 * 6)
  doc.text(`Fondo Stradale: ${accident.roadCondition || "N/D"}`, 105, 48 + 2 * 6)
  doc.text(`Traffico: ${accident.trafficCondition || "N/D"}`, 105, 48 + 3 * 6)
  doc.text(`Illuminazione: ${accident.lighting || "N/D"}`, 105, 48 + 4 * 6)
  if (accident.legalFramework) { doc.text(`Quadro normativo: ${accident.legalFramework}`, 105, 48 + 5 * 6); y += 6 }
  y += 8

  // ── 2. AGENTI INTERVENUTI ──
  y = sectionHeader(doc, "2", "AGENTI INTERVENUTI", y)
  y = sectionBody(doc, y)

  const rOfficer = accident.reportingOfficer
  const sOfficer = accident.secondOfficer
  const sup = accident.supervisor

  if (rOfficer) {
    doc.text(`I° Firmatario: ${rOfficer.name} — ${rOfficer.qualifica || ""} — Mat. ${rOfficer.matricola || ""}`, 14, y)
    y += 6
  }
  if (sOfficer) {
    doc.text(`II° Firmatario: ${sOfficer.name} — ${sOfficer.qualifica || ""} — Mat. ${sOfficer.matricola || ""}`, 14, y)
    y += 6
  }
  if (sup) {
    doc.text(`Ufficiale Validatore: ${sup.name} — ${sup.qualifica || ""} — Mat. ${sup.matricola || ""}`, 14, y)
    y += 6
  }
  if (accident.receivedAt) { doc.text(`Ricevuta segnalazione: ${format(new Date(accident.receivedAt), "HH:mm")}`, 14, y); y += 6 }
  if (accident.arrivedAt) { doc.text(`Arrivo sul posto: ${format(new Date(accident.arrivedAt), "HH:mm")}`, 14, y); y += 6 }
  if (accident.closedAt) { doc.text(`Chiusura intervento: ${format(new Date(accident.closedAt), "HH:mm")}`, 14, y); y += 6 }
  y += 4

  // ── 3. VEICOLI COINVOLTI ──
  if (accident.vehicles?.length) {
    y = sectionHeader(doc, "3", "VEICOLI COINVOLTI", y)
    y = sectionBody(doc, y)

    const vehicleRows = accident.vehicles.map((v: any, i: number) => [
      `Veicolo ${String.fromCharCode(65 + i)}`,
      v.vehicleType || "N/D",
      v.licensePlate,
      v.brand && v.model ? `${v.brand} ${v.model}` : "N/D",
      v.insuranceCompany || "N/D",
      v.towingRequired ? "Sì" : "No",
      v.damageDescription || "Nessun danno descritto"
    ])

    doc.autoTable({
      startY: y + 2,
      head: [["Rif.", "Tipo", "Targa", "Marca/Modello", "Assicurazione", "Rimozione", "Danni"]],
      body: vehicleRows,
      theme: "grid",
      headStyles: { fillColor: NAVY, fontSize: 8 },
      bodyStyles: { fontSize: 7 },
      styles: { cellPadding: 2 }
    })
    y = doc.lastAutoTable.finalY + 8
  }

  // ── 4. PERSONE COINVOLTE ──
  if (accident.people?.length) {
    y = sectionHeader(doc, "4", "PERSONE COINVOLTE", y)
    y = sectionBody(doc, y)

    const peopleRows = accident.people.map((p: any) => [
      `${p.firstName} ${p.lastName}`,
      p.role,
      p.fiscalCode || "N/D",
      p.birthDate ? format(new Date(p.birthDate), "dd/MM/yyyy") : "N/D",
      p.injuries || "Nessuna",
      p.hospitalSentTo || "-",
      p.alcoholTestDone ? (p.alcoholTestResult ? `${p.alcoholTestResult} g/L` : "Effettuato") : "No"
    ])

    doc.autoTable({
      startY: y + 2,
      head: [["Nominativo", "Ruolo", "CF", "Nascita", "Lesioni", "Ospedale", "Alcoltest"]],
      body: peopleRows,
      theme: "grid",
      headStyles: { fillColor: NAVY, fontSize: 8 },
      bodyStyles: { fontSize: 7 },
      styles: { cellPadding: 2 }
    })
    y = doc.lastAutoTable.finalY + 8
  }

  // ── 5. DICHIARAZIONI ──
  if (accident.declarations?.length) {
    y = sectionHeader(doc, "5", "DICHIARAZIONI RESE", y)
    y = sectionBody(doc, y)

    const declRows = accident.declarations.map((d: any) => [
      d.person?.firstName + " " + d.person?.lastName,
      d.type,
      d.legalWarningGiven ? "Sì" : "No",
      d.signedByPerson ? "Sì" : d.refused ? "Rifiutata" : "No",
      d.content?.substring(0, 100) + (d.content?.length > 100 ? "..." : "")
    ])

    doc.autoTable({
      startY: y + 2,
      head: [["Dichiarante", "Tipo", "Avviso Legale", "Firma", "Contenuto (estratto)"]],
      body: declRows,
      theme: "grid",
      headStyles: { fillColor: NAVY, fontSize: 8 },
      bodyStyles: { fontSize: 7 },
      styles: { cellPadding: 2 }
    })
    y = doc.lastAutoTable.finalY + 8
  }

  // ── 6. RILIEVI TECNICI ──
  const survey = accident.surveys?.[0]
  if (survey) {
    y = sectionHeader(doc, "6", "RILIEVI TECNICI SUL POSTO", y)
    y = sectionBody(doc, y)

    doc.text(`Tipo strada: ${survey.roadType || "N/D"}`, 14, y); y += 6
    if (survey.roadName) { doc.text(`Nome strada: ${survey.roadName}`, 14, y); y += 6 }
    doc.text(`Larghezza carreggiata: ${survey.roadWidth || "N/D"} m  |  Corsie: ${survey.laneCount || "N/D"}  |  Limite: ${survey.speedLimit || "N/D"} km/h`, 14, y); y += 6
    if (survey.slopeType) { doc.text(`Pendenza: ${survey.slopeType} ${survey.slopePercent ? `(${survey.slopePercent}%)` : ""}`, 14, y); y += 6 }
    if (survey.impactZoneDesc) { doc.text(`Zona d'impatto: ${survey.impactZoneDesc}`, 14, y); y += 6 }

    if (survey.skidMarksLength) { doc.text(`Tracce frenata: ${survey.skidMarksLength} m`, 14, y); y += 6 }
    if (survey.debrisDescription) { doc.text(`Detriti rilevati: ${survey.debrisDescription}`, 14, y); y += 6 }

    doc.text(`Segnaletica presente: ${survey.signagePresent?.length ? survey.signagePresent.join(", ") : "N/D"}`, 14, y); y += 6
    const damaged: string[] = []
    if (survey.signageDamaged) damaged.push("Segnaletica danneggiata")
    if (survey.guardRailDamaged) damaged.push("Guard-rail danneggiato")
    if (survey.publicLightingDamaged) damaged.push("Illuminazione pubblica danneggiata")
    if (damaged.length) { doc.text(`Danni infrastrutture: ${damaged.join(", ")}`, 14, y); y += 6 }
    if (survey.otherDamages) { doc.text(`Altri danni: ${survey.otherDamages}`, 14, y); y += 6 }

    if (survey.impactMeasures && typeof survey.impactMeasures === "object") {
      const measures = Array.isArray(survey.impactMeasures) ? survey.impactMeasures : [survey.impactMeasures]
      const measureRows = measures.map((m: any) => [m.label || "", String(m.value || ""), m.unit || "m", m.fromReference || ""])
      doc.autoTable({
        startY: y + 2,
        head: [["Misura", "Valore", "Udm", "Da riferimento"]],
        body: measureRows,
        theme: "grid",
        headStyles: { fillColor: NAVY, fontSize: 8 },
        bodyStyles: { fontSize: 7 },
        styles: { cellPadding: 2 }
      })
      y = doc.lastAutoTable.finalY + 8
    } else {
      y += 4
    }
  }

  // ── 7. ENTI INTERVENUTI ──
  if (accident.externalUnits?.length) {
    y = sectionHeader(doc, "7", "ENTI ESTERNI INTERVENUTI", y)
    y = sectionBody(doc, y)

    const unitRows = accident.externalUnits.map((u: any) => {
      const arrivedAt = u.arrivedAt ? format(new Date(u.arrivedAt), "HH:mm") : "N/D"
      const leftAt = u.leftAt ? format(new Date(u.leftAt), "HH:mm") : "N/D"
      return [u.unitType, u.unitName || "-", u.unitIdentifier || "-", arrivedAt, leftAt, u.actionsPerformed || "-"]
    })

    doc.autoTable({
      startY: y + 2,
      head: [["Ente", "Nome/Unità", "Identificativo", "Arrivo", "Partenza", "Operazioni"]],
      body: unitRows,
      theme: "grid",
      headStyles: { fillColor: NAVY, fontSize: 8 },
      bodyStyles: { fontSize: 7 },
      styles: { cellPadding: 2 }
    })
    y = doc.lastAutoTable.finalY + 8
  }

  // ── 8. SICUREZZA E TRACCE ──
  if (accident.safetyChecklist?.length) {
    y = sectionHeader(doc, "8", "MESSA IN SICUREZZA", y)
    y = sectionBody(doc, y)
    doc.text(`Checklist: ${accident.safetyChecklist.join(", ")}`, 14, y); y += 6
    if (accident.safetySignature) { doc.text("Firma Agente apposta digitalmente", 14, y); y += 6 }
    y += 4
  }

  if (accident.traces?.length) {
    y = sectionHeader(doc, "9", "TRACCE E REPERTI", y)
    y = sectionBody(doc, y)

    const traceRows = accident.traces.map((t: any) => [
      t.code, t.type, t.position || "-", t.measurement || "-", t.description || "-"
    ])

    doc.autoTable({
      startY: y + 2,
      head: [["Codice", "Tipo", "Posizione", "Misura", "Descrizione"]],
      body: traceRows,
      theme: "grid",
      headStyles: { fillColor: NAVY, fontSize: 8 },
      bodyStyles: { fontSize: 7 },
      styles: { cellPadding: 2 }
    })
    y = doc.lastAutoTable.finalY + 8
  }

  // ── 10. DINAMICA ──
  if (accident.dynamicDescription) {
    y = sectionHeader(doc, "10", "RICOSTRUZIONE DELLA DINAMICA", y)
    y = sectionBody(doc, y)

    const splitText = doc.splitTextToSize(accident.dynamicDescription, 182)
    doc.text(splitText, 14, y)
    y += splitText.length * 5 + 8
  }

  // ── 11. NOTE NORMATIVE ──
  if (accident.penalArticles?.length) {
    y = sectionHeader(doc, "11", "NOTE NORMATIVE", y)
    y = sectionBody(doc, y)
    doc.text(`Articoli CP/CdS contestati: ${accident.penalArticles.join(", ")}`, 14, y); y += 6
    if (accident.administrativeRef) { doc.text(`Riferimento L.689/81: ${accident.administrativeRef}`, 14, y); y += 6 }
    y += 4
  }

  // ── 12. FIRME ──
  y = checkPageBreak(doc, y, 230)
  y = sectionHeader(doc, "12", "SOTTOSCRIZIONE", y)
  y = sectionBody(doc, y)

  if (rOfficer) {
    const firmaText = `Il presente verbale è redatto e sottoscritto da ${rOfficer.name}, ${rOfficer.qualifica || "Agente di P.L."}, matricola ${rOfficer.matricola || "N/D"}, in servizio presso il Comando di Polizia Locale.`
    const firmaSplit = doc.splitTextToSize(firmaText, 182)
    doc.text(firmaSplit, 14, y)
    y += firmaSplit.length * 5 + 4
  }

  if (sOfficer) {
    const firma2Text = `Co-redatto da ${sOfficer.name}, ${sOfficer.qualifica || "Agente di P.L."}, matricola ${sOfficer.matricola || "N/D"}.`
    doc.text(firma2Text, 14, y)
    y += 8
  }

  // Box firme
  y = checkPageBreak(doc, y, 250)
  doc.setDrawColor(...NAVY)
  doc.setLineWidth(0.3)
  doc.rect(14, y, 85, 20)
  doc.rect(111, y, 85, 20)
  doc.setFontSize(8)
  doc.text("Firma I° Agente", 56, y + 17, { align: "center" })
  if (sOfficer) {
    doc.text("Firma II° Agente", 153, y + 17, { align: "center" })
  } else {
    doc.setFontSize(8)
    doc.text("Data e Luogo", 153, y + 17, { align: "center" })
  }
  y += 24

  // ── Footer & Watermark ──
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)

    if (accident.status !== "CHIUSO") {
      doc.setFontSize(50)
      doc.setTextColor(250, 230, 230)
      doc.setFont("helvetica", "bold")
      doc.text("NON DEFINITIVO", 105, 150, { align: "center", angle: 45 })
    }

    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.setFont("helvetica", "normal")
    doc.text(`Documento informatico ai sensi del CAD — Fascicolo: ${accident.id}`, 14, 285)
    doc.text(`Pagina ${i} di ${pageCount}`, 196, 285, { align: "right" })
  }

  return doc.output('arraybuffer')
}
