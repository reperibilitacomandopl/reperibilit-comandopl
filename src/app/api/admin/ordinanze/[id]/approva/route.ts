import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// POST /api/admin/ordinanze/[id]/approva
// Body: { bozzaId, azione: "APPROVA" | "RIGETTA", note? }
// Approva o rigetta la bozza; se approvata genera il DOCX e il PDF.

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  }

  // Solo ADMIN/SUPERADMIN possono approvare
  if (session.user.role !== "ADMIN" && !session.user.isSuperAdmin) {
    return NextResponse.json(
      { error: "Solo gli amministratori possono approvare le ordinanze" },
      { status: 403 }
    )
  }

  const { id } = await params

  try {
    const body = await req.json()
    const { bozzaId, azione, note } = body as {
      bozzaId: string
      azione: "APPROVA" | "RIGETTA"
      note?: string
    }

    if (!bozzaId || !azione) {
      return NextResponse.json(
        { error: "bozzaId e azione sono obbligatori" },
        { status: 400 }
      )
    }

    const bozza = await prisma.ordinanzaBozza.findUnique({
      where: { id: bozzaId, requestId: id, tenantId: session.user.tenantId },
      include: {
        request: {
          include: { tenant: { select: { name: true } } },
        },
      },
    })

    if (!bozza) {
      return NextResponse.json({ error: "Bozza non trovata" }, { status: 404 })
    }

    if (bozza.stato !== "BOZZA") {
      return NextResponse.json(
        { error: "La bozza è già stata processata" },
        { status: 409 }
      )
    }

    if (azione === "RIGETTA") {
      // Segna bozza come rigettata
      await prisma.ordinanzaBozza.update({
        where: { id: bozzaId },
        data: {
          stato: "RIGETTATA",
          noteOperatore: note,
          approvataDaId: session.user.id,
          approvataAt: new Date(),
        },
      })

      await prisma.ordinanzaRequest.update({
        where: { id },
        data: { stato: "RIGETTATA" },
      })

      return NextResponse.json({ success: true, stato: "RIGETTATA" })
    }

    // azione === "APPROVA"
    const testoFinale = bozza.testoModificato ?? bozza.testo
    const nomeComune = bozza.request.tenant?.name ?? "Polizia Locale"

    // --- Genera DOCX ---
    let docxUrl: string | null = null
    let pdfUrl: string | null = null
    const safeName = (bozza.numeroProtocollo ?? bozzaId).replace(/[/\\:*?"<>|]/g, "-")

    try {
      const { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } = await import("docx")
      const fs = await import("fs/promises")
      const path = await import("path")
      const { getStoragePath } = await import("@/lib/storage")

      const righe = testoFinale.split("\n").filter(Boolean)

      const docChildren = righe.map((riga: string) => {
        const isTitle = riga.toUpperCase() === riga && riga.length > 5
        const isSeparator = riga.startsWith("---")
        if (isSeparator) return new Paragraph({ text: "", spacing: { after: 200 } })
        if (isTitle) {
          return new Paragraph({
            children: [new TextRun({ text: riga, bold: true, size: 24 })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 400, after: 200 },
          })
        }
        return new Paragraph({
          children: [new TextRun({ text: riga, size: 22 })],
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 120 },
        })
      })

      const headerParagraphs = [
        new Paragraph({
          children: [new TextRun({ text: nomeComune.toUpperCase(), bold: true, size: 28 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [new TextRun({ text: "COMANDO POLIZIA LOCALE", bold: true, size: 24 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),
        new Paragraph({
          children: [new TextRun({ text: `ORDINANZA N. ${bozza.numeroProtocollo ?? "___/___"}`, bold: true, size: 26 })],
          alignment: AlignmentType.CENTER,
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 600 },
        }),
      ]

      const doc = new Document({
        sections: [{ properties: {}, children: [...headerParagraphs, ...docChildren] }],
      })

      const docxBuffer = await Packer.toBuffer(doc)
      const tenantIdDocx = session.user.tenantId ?? "default"
      const docxDir = getStoragePath(tenantIdDocx, "ordinanze")
      await fs.mkdir(docxDir, { recursive: true })
      const docxPath = path.join(docxDir, `${safeName}.docx`)
      await fs.writeFile(docxPath, docxBuffer)
      docxUrl = `tenants/${tenantIdDocx}/ordinanze/${safeName}.docx`
    } catch (docxErr) {
      console.error("[ORDINANZA_DOCX_ERR]", docxErr)
    }

    // --- Genera PDF ---
    try {
      const { jsPDF } = await import("jspdf")
      const fs = await import("fs/promises")
      const path = await import("path")
      const { getStoragePath } = await import("@/lib/storage")

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })

      doc.setFontSize(14)
      doc.setFont("helvetica", "bold")
      doc.text(nomeComune.toUpperCase(), 105, 20, { align: "center" })
      doc.setFontSize(11)
      doc.text("COMANDO POLIZIA LOCALE", 105, 28, { align: "center" })
      doc.setFontSize(13)
      doc.text(`ORDINANZA N. ${bozza.numeroProtocollo ?? "___/___"}`, 105, 40, { align: "center" })
      doc.setLineWidth(0.5)
      doc.line(15, 46, 195, 46)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(10)

      let y = 55
      for (const riga of testoFinale.split("\n").filter(Boolean)) {
        if (y > 270) { doc.addPage(); y = 20 }
        const isTitolo = riga.toUpperCase() === riga && riga.length > 5
        doc.setFont("helvetica", isTitolo ? "bold" : "normal")
        doc.setFontSize(isTitolo ? 11 : 10)
        const wrapped = doc.splitTextToSize(riga, 175)
        doc.text(wrapped, 15, y)
        y += (wrapped.length * 5) + (isTitolo ? 5 : 2)
      }

      doc.setFontSize(8)
      doc.text(`Documento generato il ${new Date().toLocaleDateString("it-IT")} — ${nomeComune}`, 105, 287, { align: "center" })

      const pdfBuffer = Buffer.from(doc.output("arraybuffer"))
      const tenantIdPdf = session.user.tenantId ?? "default"
      const pdfDir = getStoragePath(tenantIdPdf, "ordinanze")
      await fs.mkdir(pdfDir, { recursive: true })
      const pdfPath = path.join(pdfDir, `${safeName}.pdf`)
      await fs.writeFile(pdfPath, pdfBuffer)
      pdfUrl = `tenants/${tenantIdPdf}/ordinanze/${safeName}.pdf`
    } catch (pdfErr) {
      console.error("[ORDINANZA_PDF_ERR]", pdfErr)
    }

    // Aggiorna bozza come APPROVATA
    const updated = await prisma.ordinanzaBozza.update({
      where: { id: bozzaId },
      data: {
        stato: "APPROVATA",
        noteOperatore: note,
        approvataDaId: session.user.id,
        approvataAt: new Date(),
        fileDocxUrl: docxUrl,
        filePdfUrl: pdfUrl,
      },
    })

    // Aggiorna stato pratica → APPROVATA
    await prisma.ordinanzaRequest.update({
      where: { id },
      data: { stato: "APPROVATA" },
    })

    return NextResponse.json({
      success: true,
      bozza: updated,
      docxUrl,
      pdfUrl,
    })
  } catch (error) {
    console.error("[ORDINANZA_APPROVA]", error)
    const msg = error instanceof Error ? error.message : "Errore sconosciuto"
    return NextResponse.json({ error: `Errore approvazione: ${msg}` }, { status: 500 })
  }
}
