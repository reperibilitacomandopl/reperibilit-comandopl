import jsPDF from "jspdf"
import "jspdf-autotable"
import { format } from "date-fns"
import { it } from "date-fns/locale"

// Interfaces for typing
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: import("jspdf-autotable").UserOptions) => jsPDF;
  lastAutoTable: { finalY: number };
  internal: any;
}

export async function generateAccidentReportPDF({
  accident,
  tenantName = "Comando Polizia Locale"
}: {
  accident: any;
  tenantName?: string;
}) {
  const doc = new jsPDF() as jsPDFWithAutoTable

  const navelBlue: [number, number, number] = [0, 23, 54]
  const titleColor: [number, number, number] = [15, 23, 42]

  // Header
  doc.setFontSize(20)
  doc.setTextColor(...navelBlue)
  doc.setFont("helvetica", "bold")
  doc.text(`POLIZIA LOCALE - ${tenantName.toUpperCase()}`, 105, 20, { align: "center" })

  doc.setFontSize(14)
  doc.text("RAPPORTO DI INCIDENTE STRADALE", 105, 28, { align: "center" })

  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(100, 100, 100)
  doc.text(`Protocollo: ${accident.protocolNumber || "Bozza"} - Generato il ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 105, 34, { align: "center" })

  doc.setDrawColor(...navelBlue)
  doc.setLineWidth(0.5)
  doc.line(14, 38, 196, 38)

  // Section 1: Dati Generali
  doc.setFontSize(12)
  doc.setTextColor(...titleColor)
  doc.setFont("helvetica", "bold")
  doc.text("1. DATI GENERALI", 14, 48)

  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(50, 50, 50)
  
  const formattedDate = accident.date ? format(new Date(accident.date), "dd MMMM yyyy 'alle ore' HH:mm", { locale: it }) : "N/D"
  
  doc.text(`Data e Ora: ${formattedDate}`, 14, 55)
  doc.text(`Luogo: ${accident.address}`, 14, 61)
  doc.text(`Coordinate GPS: ${accident.lat || "N/D"}, ${accident.lng || "N/D"}`, 14, 67)
  doc.text(`Gravità: ${accident.severity.replace(/_/g, " ")}`, 14, 73)
  
  doc.text(`Condizioni Meteo: ${accident.weatherCondition || "N/D"}`, 105, 55)
  doc.text(`Fondo Stradale: ${accident.roadCondition || "N/D"}`, 105, 61)
  doc.text(`Traffico: ${accident.trafficCondition || "N/D"}`, 105, 67)
  doc.text(`Agente Rilevatore: ${accident.reportingOfficer?.name || "N/D"}`, 105, 73)

  // Section 2: Dinamica
  doc.setFontSize(12)
  doc.setTextColor(...titleColor)
  doc.setFont("helvetica", "bold")
  doc.text("2. DESCRIZIONE DELLA DINAMICA", 14, 85)
  
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(50, 50, 50)
  
  const splitText = doc.splitTextToSize(accident.dynamicDescription || "Nessuna dinamica inserita.", 182)
  doc.text(splitText, 14, 92)

  let finalY = 92 + (splitText.length * 5) + 10

  // Section 3: Veicoli Coinvolti
  if (accident.vehicles && accident.vehicles.length > 0) {
    doc.setFontSize(12)
    doc.setTextColor(...titleColor)
    doc.setFont("helvetica", "bold")
    doc.text("3. VEICOLI COINVOLTI", 14, finalY)

    const vehicleRows = accident.vehicles.map((v: any, index: number) => [
      `Veicolo ${index + 1}`,
      v.vehicleType,
      v.licensePlate,
      v.insuranceCompany || "N/D",
      v.damageDescription || "Nessun danno descritto"
    ])

    doc.autoTable({
      startY: finalY + 5,
      head: [["Rif.", "Tipo", "Targa", "Assicurazione", "Danni Evidenti"]],
      body: vehicleRows,
      theme: "grid",
      headStyles: { fillColor: navelBlue }
    })

    finalY = doc.lastAutoTable.finalY + 15
  }

  // Section 4: Persone Coinvolte
  if (accident.people && accident.people.length > 0) {
    doc.setFontSize(12)
    doc.setTextColor(...titleColor)
    doc.setFont("helvetica", "bold")
    doc.text("4. PERSONE COINVOLTE", 14, finalY)

    const peopleRows = accident.people.map((p: any) => [
      `${p.firstName} ${p.lastName}`,
      p.role,
      p.fiscalCode || "N/D",
      p.injuries || "Nessuna lesione"
    ])

    doc.autoTable({
      startY: finalY + 5,
      head: [["Nominativo", "Ruolo", "Codice Fiscale", "Lesioni Dichiarate"]],
      body: peopleRows,
      theme: "grid",
      headStyles: { fillColor: navelBlue }
    })
  }

  // Footer & Status watermark
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    
    // Watermark if not closed
    if (accident.status !== "CHIUSO") {
      doc.setFontSize(60)
      doc.setTextColor(250, 230, 230)
      doc.setFont("helvetica", "bold")
      doc.text("NON DEFINITIVO", 105, 150, { align: "center", angle: 45 })
    }

    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.setFont("helvetica", "normal")
    doc.text(`Documento informatico ai sensi del CAD - Fascicolo: ${accident.id}`, 14, 285)
    doc.text(`Pagina ${i} di ${pageCount}`, 196, 285, { align: "right" })
  }

  const pdfArrayBuffer = doc.output('arraybuffer')
  return pdfArrayBuffer
}
