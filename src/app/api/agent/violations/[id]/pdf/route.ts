import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  }

  try {
    const violation = await prisma.violation.findUnique({
      where: { 
        id: params.id,
        tenantId: session.user.tenantId
      },
      include: { 
        user: { select: { name: true, matricola: true } },
        tenant: true
      }
    })

    if (!violation) {
      return NextResponse.json({ error: "Verbale non trovato" }, { status: 404 })
    }

    const { jsPDF } = await import("jspdf")
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })

    // Intestazione
    doc.setFontSize(16)
    doc.setFont("helvetica", "bold")
    doc.text("VERBALE DI ACCERTAMENTO", 105, 20, { align: "center" })
    
    doc.setFontSize(10)
    doc.text(`Comando di Polizia Locale: ${violation.tenant?.name || "Polizia Locale"}`, 105, 28, { align: "center" })
    doc.setFont("helvetica", "normal")
    doc.text(`Verbale N. ${violation.id.substring(0, 8).toUpperCase()}`, 105, 34, { align: "center" })
    
    // Linea separatrice
    doc.setLineWidth(0.5)
    doc.line(15, 40, 195, 40)

    // Dati generali
    let y = 50
    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.text("DATI GENERALI", 15, y)
    
    y += 8
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.text(`Data e Ora: ${new Date(violation.createdAt).toLocaleString("it-IT")}`, 15, y)
    doc.text(`Luogo: ${violation.indirizzo || "Non specificato"}`, 110, y)
    
    y += 6
    doc.text(`Agente Accertatore: ${violation.user.name} (Matr. ${violation.user.matricola})`, 15, y)

    y += 10
    doc.setLineWidth(0.2)
    doc.line(15, y, 195, y)
    
    // Dati Veicolo
    y += 10
    doc.setFont("helvetica", "bold")
    doc.text("VEICOLO", 15, y)
    
    y += 8
    doc.setFont("helvetica", "normal")
    doc.text(`Targa: ${violation.targa}`, 15, y)
    doc.text(`Marca e Modello: ${violation.marcaVeicolo || "N/D"} ${violation.modelloVeicolo || ""}`, 80, y)
    doc.text(`Colore: ${violation.coloreVeicolo || "N/D"}`, 160, y)

    y += 10
    doc.line(15, y, 195, y)

    // Dati Trasgressore
    if (violation.trasgressoreNome || violation.trasgressoreCognome) {
      y += 10
      doc.setFont("helvetica", "bold")
      doc.text("TRASGRESSORE", 15, y)
      
      y += 8
      doc.setFont("helvetica", "normal")
      doc.text(`Cognome e Nome: ${violation.trasgressoreCognome} ${violation.trasgressoreNome}`, 15, y)
      if (violation.patenteNumero) {
        doc.text(`Patente N.: ${violation.patenteNumero}`, 110, y)
      }
      y += 10
      doc.line(15, y, 195, y)
    }

    // Violazione
    y += 10
    doc.setFont("helvetica", "bold")
    doc.text("VIOLAZIONE ACCERTATA", 15, y)
    
    y += 8
    doc.setFont("helvetica", "normal")
    doc.text(`Articolo C.d.S.: ${violation.articoloCDS}`, 15, y)
    
    y += 6
    doc.text(`Descrizione sintetica: ${violation.tipoInfrazione}`, 15, y)

    y += 6
    const sanzioneStr = `Sanzione Pecuniaria: Euro ${violation.importo.toFixed(2)}`
    doc.setFont("helvetica", "bold")
    doc.text(sanzioneStr, 15, y)
    if (violation.puntiPatente > 0) {
      doc.text(`Decurtazione Punti: ${violation.puntiPatente}`, 110, y)
    }

    // Testo Discorsivo (generato)
    y += 10
    doc.line(15, y, 195, y)
    y += 10
    doc.setFont("helvetica", "bold")
    doc.text("DINAMICA ACCERTAMENTO", 15, y)
    
    y += 8
    doc.setFont("helvetica", "normal")
    let testoGenerato = violation.descrizioneGenerata
    if (!testoGenerato) {
      // Fallback discorsivo
      testoGenerato = `Si dà atto che in data ${new Date(violation.createdAt).toLocaleString("it-IT")}, l'agente verbalizzante ha accertato che il veicolo tg. ${violation.targa} procedeva violando l'Art. ${violation.articoloCDS} del C.d.S. (${violation.tipoInfrazione.toLowerCase()}).`
      if (violation.indirizzo) testoGenerato += ` Accertamento in ${violation.indirizzo}.`
      if (violation.trasgressoreCognome) testoGenerato += ` Conducente identificato in ${violation.trasgressoreNome} ${violation.trasgressoreCognome}.`
      if (violation.note) testoGenerato += ` Note: ${violation.note}`
    }

    // split test into multiple lines
    const lines = doc.splitTextToSize(testoGenerato, 170)
    doc.text(lines, 15, y)
    
    y += (lines.length * 5) + 15

    // Firme
    if (y > 250) { doc.addPage(); y = 20 }
    
    doc.setFont("helvetica", "bold")
    doc.text("IL VERBALIZZANTE", 140, y)
    
    y += 10
    doc.setFont("helvetica", "normal")
    doc.text(`${violation.user.name}`, 140, y)
    
    y += 20
    doc.setFontSize(8)
    doc.text("Documento generato elettronicamente dal Sistema Informativo di Polizia Locale", 105, 280, { align: "center" })

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"))
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="verbale_${violation.targa}_${violation.id.substring(0,6)}.pdf"`
      }
    })
  } catch (error) {
    console.error("[VIOLATION_SINGLE_PDF_ERROR]", error)
    return NextResponse.json({ error: "Errore generazione PDF" }, { status: 500 })
  }
}
