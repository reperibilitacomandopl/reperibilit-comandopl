import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  }

  try {
    const violations = await prisma.violation.findMany({
      where: { tenantId: session.user.tenantId, deletedAt: null },
      include: { user: { select: { name: true, matricola: true } } },
      orderBy: { createdAt: "desc" }
    })

    const { jsPDF } = await import("jspdf")
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })

    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.text("REGISTRO VERBALI CDS", 14, 20)
    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    doc.text(`Comando: ${session.user.tenantName || "Polizia Locale"} — Data: ${new Date().toLocaleDateString("it-IT")}`, 14, 26)

    // Table header
    const headers = ["Targa", "Data", "Articolo CDS", "Infrazione", "Importo", "Stato", "Agente"]
    const colWidths = [28, 32, 30, 50, 20, 22, 50]
    let y = 34

    doc.setFont("helvetica", "bold")
    doc.setFontSize(7)
    headers.forEach((h, i) => {
      doc.text(h, 14 + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y)
    })
    y += 4

    doc.setFont("helvetica", "normal")
    doc.setFontSize(7)
    for (const v of violations) {
      if (y > 185) { doc.addPage(); y = 14 }
      const row = [
        v.targa,
        new Date(v.createdAt).toLocaleDateString("it-IT"),
        v.articoloCDS,
        v.tipoInfrazione.replace(/_/g, " ").substring(0, 30),
        `€ ${v.importo.toFixed(2)}`,
        v.stato,
        `${v.user.name} (${v.user.matricola})`
      ]
      row.forEach((cell, i) => {
        doc.text(cell, 14 + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y)
      })
      y += 6
    }

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"))
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=\"registro-verbali.pdf\""
      }
    })
  } catch (error) {
    console.error("[VIOLATIONS_PDF_ERROR]", error)
    return NextResponse.json({ error: "Errore generazione PDF" }, { status: 500 })
  }
}
