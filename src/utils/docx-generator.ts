import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber, LevelFormat
} from "docx"
import { format } from "date-fns"
import { it } from "date-fns/locale"

const NAVY = "1A3A6B"
const NAVY_M = "2E5FA3"
const WHITE = "FFFFFF"
const GREY_BG = "F5F6FA"
const GREEN_BG = "E8F5E9"
const RED_BG = "FDECEA"
const BLUE_L = "D6E4F7"

const BORDER_GREY = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" }
const borders = { top: BORDER_GREY, bottom: BORDER_GREY, left: BORDER_GREY, right: BORDER_GREY }
const noBorder = { style: BorderStyle.NIL, size: 0, color: WHITE }

const cell = (children: any[], opts: any = {}) => new TableCell({
  borders: opts.noBorder ? { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder } : borders,
  margins: { top: 60, bottom: 60, left: 100, right: 100 },
  shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR } : undefined,
  width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
  verticalAlign: VerticalAlign.CENTER,
  children
})

const hdrCell = (txt: string, width?: number) => cell(
  [new Paragraph({ alignment: AlignmentType.CENTER, children: [b(txt, WHITE, 18)] })],
  { fill: NAVY, width }
)

const b = (txt: string, color = "000000", size = 20) => new TextRun({ text: txt, bold: true, color, size, font: "Arial" })
const t = (txt: string, color = "1A1A1A", size = 19) => new TextRun({ text: txt, color, size, font: "Arial" })

const heading1 = (txt: string) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 280, after: 140 },
  shading: { fill: NAVY, type: ShadingType.CLEAR },
  indent: { left: 120 },
  children: [b(txt, WHITE, 24)]
})

const heading2 = (txt: string) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 240, after: 100 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: NAVY_M, space: 4 } },
  children: [b(txt, NAVY_M, 21)]
})

const spacer = () => new Paragraph({ children: [new TextRun({ text: "", size: 12, font: "Arial" })], spacing: { before: 60, after: 60 } })

const numbering = {
  config: [{
    reference: "bullets",
    levels: [{
      level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 480, hanging: 240 }, spacing: { before: 30, after: 30 } } }
    }]
  }]
}

function fmt(date: any, f = "dd/MM/yyyy HH:mm") {
  if (!date) return "N/D"
  try { return format(new Date(date), f, { locale: it }) } catch { return String(date) }
}

type DocSection = Paragraph | Table

// ═══════════════════════════════════════════════════════════════════
// 1. SINISTRO COMPLETO
// ═══════════════════════════════════════════════════════════════════
export async function generateAccidentDocx({
  accident, tenantName = "Comando Polizia Locale"
}: { accident: any; tenantName?: string }): Promise<Uint8Array> {
  const children: DocSection[] = []

  // Header block
  children.push(
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [b(`POLIZIA LOCALE - ${tenantName.toUpperCase()}`, NAVY, 26)] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [b("RAPPORTO DI INCIDENTE STRADALE", NAVY, 22)] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [
      t(`Protocollo: ${accident.protocolNumber || "Bozza"}  |  Generato il ${fmt(new Date())}  |  Stato: ${accident.status}`, "666666", 18)
    ]}),
  )

  // 1. Dati Generali
  children.push(heading1("1. DATI GENERALI"))
  children.push(new Paragraph({
    spacing: { after: 60 },
    children: [
      t(`Data e Ora: ${fmt(accident.date)}  |  Gravità: ${(accident.severity || "").replace(/_/g, " ")}`, "333333"),
      t(`\nLuogo: ${accident.address}`, "333333"),
      t(`\nCoordinate GPS: ${accident.lat || "N/D"}, ${accident.lng || "N/D"}`, "333333"),
      t(`\nMeteo: ${accident.weatherCondition || "N/D"}  |  Fondo: ${accident.roadCondition || "N/D"}  |  Traffico: ${accident.trafficCondition || "N/D"}  |  Luce: ${accident.lighting || "N/D"}`, "333333"),
    ]
  }))

  // 2. Agenti
  if (accident.reportingOfficer) {
    children.push(heading2("Agenti Intervenuti"))
    children.push(new Paragraph({
      spacing: { after: 60 },
      children: [
        t(`I° Firmatario: ${accident.reportingOfficer.name} — ${accident.reportingOfficer.qualifica || ""} — Mat. ${accident.reportingOfficer.matricola || ""}`, "333333"),
        accident.secondOfficer ? t(`\nII° Firmatario: ${accident.secondOfficer.name} — ${accident.secondOfficer.qualifica || ""} — Mat. ${accident.secondOfficer.matricola || ""}`, "333333") : new TextRun({ text: "" }),
        accident.supervisor ? t(`\nUfficiale Validatore: ${accident.supervisor.name} — ${accident.supervisor.qualifica || ""} — Mat. ${accident.supervisor.matricola || ""}`, "333333") : new TextRun({ text: "" }),
      ]
    }))
  }

  // 3. Veicoli
  if (accident.vehicles?.length) {
    children.push(heading1("2. VEICOLI COINVOLTI"))
    const vRows = accident.vehicles.map((v: any, i: number) => new TableRow({
      children: [
        cell([new Paragraph({ children: [b(`Veicolo ${String.fromCharCode(65 + i)}`, NAVY, 18)] })], { width: 1200 }),
        cell([new Paragraph({ children: [t(`${v.vehicleType}\nTarga: ${v.licensePlate}`, "333333", 18)] })], { width: 2200 }),
        cell([new Paragraph({ children: [t(`${v.brand && v.model ? v.brand + " " + v.model + "\n" : ""}Ass.: ${v.insuranceCompany || "N/D"}`, "333333", 18)] })], { width: 2200 }),
        cell([new Paragraph({ children: [t(v.damageDescription || "Nessun danno descritto", "666666", 17)] })], { width: 3400 }),
      ]
    }))
    vRows.unshift(new TableRow({ children: [hdrCell("Rif.", 1200), hdrCell("Dati Veicolo", 2200), hdrCell("Marca / Assicurazione", 2200), hdrCell("Danni", 3400)] }))
    children.push(new Table({ width: { size: 9000, type: WidthType.DXA }, columnWidths: [1200, 2200, 2200, 3400], rows: vRows }))
    children.push(spacer())
  }

  // 4. Persone
  if (accident.people?.length) {
    children.push(heading1("3. PERSONE COINVOLTE"))
    const pRows = accident.people.map((p: any) => new TableRow({
      children: [
        cell([new Paragraph({ children: [b(`${p.firstName} ${p.lastName}`, NAVY, 18)] })], { width: 1800 }),
        cell([new Paragraph({ children: [t(p.role, "333333", 18)] })], { width: 1200 }),
        cell([new Paragraph({ children: [t(p.fiscalCode || "N/D", "333333", 18)] })], { width: 1500 }),
        cell([new Paragraph({ children: [t(p.injuries || "Nessuna", "333333", 18)] })], { width: 1200 }),
        cell([new Paragraph({ children: [t(`${p.seatbeltUsed ? "Cintura SI" : "Cintura NO"}  ${p.alcoholTestDone ? "Alcol: " + (p.alcoholTestResult || "") : ""}`, "666666", 17)] })], { width: 1500 }),
        cell([new Paragraph({ children: [t(p.email || p.contactPhone || "-", "666666", 17)] })], { width: 1800 }),
      ]
    }))
    pRows.unshift(new TableRow({ children: [hdrCell("Nominativo", 1800), hdrCell("Ruolo", 1200), hdrCell("CF", 1500), hdrCell("Lesioni", 1200), hdrCell("Cintura/Test", 1500), hdrCell("Contatto", 1800)] }))
    children.push(new Table({ width: { size: 9000, type: WidthType.DXA }, columnWidths: [1800, 1200, 1500, 1200, 1500, 1800], rows: pRows }))
    children.push(spacer())
  }

  // 5. Dichiarazioni
  if (accident.declarations?.length) {
    children.push(heading1("4. DICHIARAZIONI RESE"))
    for (const d of accident.declarations) {
      children.push(new Paragraph({
        spacing: { after: 40 },
        children: [
          b(`${d.type} — ${d.person?.firstName || ""} ${d.person?.lastName || ""}  `, NAVY_M, 19),
          t(`${d.legalWarningGiven ? "(Ammonizione art.64 C.p.p. resa) " : ""}${d.signedByPerson ? "(Firmata)" : d.refused ? "(Rifiutata)" : "(Non firmata)"}`, "666666", 17),
        ]
      }))
      children.push(new Paragraph({
        spacing: { after: 80 }, indent: { left: 240 },
        children: [t(d.content, "333333", 18)],
      }))
    }
  }

  // 6. Dinamica
  if (accident.dynamicDescription) {
    children.push(heading1("5. RICOSTRUZIONE DELLA DINAMICA"))
    children.push(new Paragraph({ spacing: { after: 80 }, children: [t(accident.dynamicDescription, "333333", 19)] }))
  }

  // 7. Note Normative
  if (accident.penalArticles?.length) {
    children.push(heading1("6. NOTE NORMATIVE"))
    children.push(new Paragraph({
      spacing: { after: 60 },
      children: [
        t(`Articoli CP/CdS contestati: ${accident.penalArticles.join(", ")}`, "333333"),
        accident.administrativeRef ? t(`\nRif. L.689/81: ${accident.administrativeRef}`, "333333") : new TextRun({ text: "" }),
      ]
    }))
  }

  // 8. Firme
  children.push(heading1("7. SOTTOSCRIZIONE"))
  if (accident.reportingOfficer) {
    children.push(new Paragraph({
      spacing: { after: 40 },
      children: [t(`Il presente verbale è redatto e sottoscritto da ${accident.reportingOfficer.name}, ${accident.reportingOfficer.qualifica || "Agente di P.L."}, matricola ${accident.reportingOfficer.matricola || "N/D"}, in servizio presso il Comando di Polizia Locale.`, "333333", 19)]
    }))
  }
  children.push(new Paragraph({ spacing: { before: 200, after: 40 }, children: [t("Firma I° Agente: _________________________", "333333", 19)] }))
  if (accident.secondOfficer) {
    children.push(new Paragraph({ spacing: { after: 40 }, children: [t("Firma II° Agente: _________________________", "333333", 19)] }))
  }
  children.push(new Paragraph({ children: [t(`Data: ____/____/________    Luogo: _________________________`, "333333", 19)] }))

  const doc = new Document({
    numbering,
    styles: {
      default: { document: { run: { font: "Arial", size: 20 } } },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 24, bold: true, color: WHITE, font: "Arial" },
          paragraph: { spacing: { before: 280, after: 140 }, outlineLevel: 0 } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 21, bold: true, color: NAVY_M, font: "Arial" },
          paragraph: { spacing: { before: 240, after: 100 }, outlineLevel: 1 } },
      ]
    },
    sections: [{
      properties: {
        page: { size: { width: 11906, height: 16838 }, margin: { top: 1000, right: 900, bottom: 1000, left: 900 } }
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: NAVY, space: 4 } },
            children: [b(`${tenantName.toUpperCase()} — Ufficio Infortunistica  `, NAVY, 16), t(`Prot. ${accident.protocolNumber || "Bozza"}`, "666666", 15)]
          })]
        })
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: NAVY, space: 4 } },
            children: [t("Documento informatico ai sensi del CAD  |  Pagina ", "888888", 15), new TextRun({ children: [PageNumber.CURRENT], color: "888888", size: 15, font: "Arial" }), t("  di  ", "888888", 15), new TextRun({ children: [PageNumber.TOTAL_PAGES], color: "888888", size: 15, font: "Arial" })]
          })]
        })
      },
      children
    }]
  })

  const buf = await Packer.toBuffer(doc)
  return new Uint8Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))
}

// ═══════════════════════════════════════════════════════════════════
// 2. DICHIARAZIONE SINGOLA PERSONA
// ═══════════════════════════════════════════════════════════════════
export async function generatePersonDeclarationDocx({
  person, declarations, accident, tenantName = "Comando Polizia Locale"
}: { person: any; declarations: any[]; accident: any; tenantName?: string }): Promise<Uint8Array> {
  const children: DocSection[] = []
  children.push(
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [b(`POLIZIA LOCALE - ${tenantName.toUpperCase()}`, NAVY, 24)] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [b("DICHIARAZIONI RESE", NAVY, 20)] }),
    new Paragraph({ spacing: { after: 60 }, children: [t(`Sinistro: ${accident.protocolNumber} del ${fmt(accident.date, "dd/MM/yyyy")}`, "666666")] }),
  )

  children.push(heading2("Dati del Dichiarante"))
  children.push(new Paragraph({
    spacing: { after: 60 },
    children: [
      t(`Nome: ${person.firstName} ${person.lastName}`, "333333"),
      t(`\nRuolo: ${person.role}  |  CF: ${person.fiscalCode || "N/D"}`, "333333"),
      person.birthDate ? t(`\nNato il ${fmt(person.birthDate, "dd/MM/yyyy")} a ${person.birthPlace || "N/D"}`, "333333") : new TextRun({ text: "" }),
      person.documentType ? t(`\nDocumento: ${person.documentType}${person.documentNumber ? " n. " + person.documentNumber : ""}`, "333333") : new TextRun({ text: "" }),
      person.address ? t(`\nResidenza: ${person.address}`, "333333") : new TextRun({ text: "" }),
    ]
  }))

  for (const d of declarations) {
    children.push(heading2(`Dichiarazione — ${d.type}`))
    const meta: string[] = []
    if (d.legalWarningGiven) meta.push("Ammonizione art. 64 C.p.p. resa")
    if (d.signedByPerson) meta.push("Firmata dall'interessato")
    else if (d.refused) meta.push("Rifiutata")
    else meta.push("Non firmata")
    meta.push(`Raccolta il ${fmt(d.recordedAt)} da ${d.recordedBy?.name || "N/D"}`)
    children.push(new Paragraph({ spacing: { after: 40 }, children: [b(meta.join("  |  "), "666666", 17)] }))
    children.push(new Paragraph({
      spacing: { after: 80 }, indent: { left: 240 },
      children: [t(d.content, "333333", 19)],
    }))
  }

  children.push(new Paragraph({ spacing: { before: 400, after: 40 }, children: [t("Firma del Dichiarante: _________________________", "333333", 19)] }))
  children.push(new Paragraph({ children: [t(`Agente che ha raccolto la dichiarazione: _________________________    Data: ____/____/________`, "333333", 19)] }))

  const doc = new Document({
    numbering,
    styles: {
      default: { document: { run: { font: "Arial", size: 20 } } },
      paragraphStyles: [
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 21, bold: true, color: NAVY_M, font: "Arial" },
          paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 1 } },
      ]
    },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1000, right: 900, bottom: 1000, left: 900 } } },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: NAVY, space: 4 } },
            children: [b("Dichiarazioni — Sinistro " + (accident.protocolNumber || "Bozza") + "  ", NAVY, 14)]
          })]
        })
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: NAVY, space: 4 } },
            children: [t("Documento riservato  |  Pagina ", "888888", 14), new TextRun({ children: [PageNumber.CURRENT], color: "888888", size: 14, font: "Arial" })]
          })]
        })
      },
      children
    }]
  })
  const buf = await Packer.toBuffer(doc)
  return new Uint8Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))
}

// ═══════════════════════════════════════════════════════════════════
// 3. RELAZIONE DI SERVIZIO
// ═══════════════════════════════════════════════════════════════════
export async function generateServiceReportDocx({
  report, author, tenantName = "Comando Polizia Locale"
}: { report: any; author?: any; tenantName?: string }): Promise<Uint8Array> {
  const children: DocSection[] = []
  children.push(
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [b(`POLIZIA LOCALE - ${tenantName.toUpperCase()}`, NAVY, 26)] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [b("RELAZIONE DI SERVIZIO", NAVY, 22)] }),
  )

  children.push(heading1("1. DATI DELLA RELAZIONE"))
  children.push(new Paragraph({
    spacing: { after: 60 },
    children: [
      t(`Data: ${fmt(report.reportDate, "dd/MM/yyyy")}`, "333333"),
      t(`\nStato: ${report.status || "BOZZA"}`, "333333"),
      author ? t(`\nRedatta da: ${author.name} — ${author.qualifica || ""} — Mat. ${author.matricola || ""}`, "333333") : new TextRun({ text: "" }),
    ]
  }))

  children.push(heading1("2. ATTIVITÀ SVOLTE"))
  children.push(new Paragraph({ spacing: { after: 80 }, children: [t(report.activities || "Nessuna attività descritta.", "333333", 19)] }))

  if (report.outcome) {
    children.push(heading1("3. ESITO"))
    children.push(new Paragraph({ spacing: { after: 80 }, children: [t(report.outcome, "333333", 19)] }))
  }

  if (report.notes) {
    children.push(heading1("4. NOTE E OSSERVAZIONI"))
    children.push(new Paragraph({ spacing: { after: 80 }, children: [t(report.notes, "333333", 19)] }))
  }

  children.push(new Paragraph({ spacing: { before: 400, after: 40 }, children: [t("Firma dell'Agente: _________________________", "333333", 19)] }))
  children.push(new Paragraph({ children: [t(`Data: ____/____/________`, "333333", 19)] }))

  const doc = new Document({
    styles: {
      default: { document: { run: { font: "Arial", size: 20 } } },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 24, bold: true, color: WHITE, font: "Arial" },
          paragraph: { spacing: { before: 280, after: 140 }, outlineLevel: 0 } },
      ]
    },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1000, right: 900, bottom: 1000, left: 900 } } },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: NAVY, space: 4 } },
            children: [b(`${tenantName.toUpperCase()} — Ufficio Infortunistica  `, NAVY, 16)]
          })]
        })
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: NAVY, space: 4 } },
            children: [t("Documento informatico ai sensi del CAD  |  Pagina ", "888888", 14), new TextRun({ children: [PageNumber.CURRENT], color: "888888", size: 14, font: "Arial" })]
          })]
        })
      },
      children
    }]
  })
  const buf = await Packer.toBuffer(doc)
  return new Uint8Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))
}

// ═══════════════════════════════════════════════════════════════════
// 4. VERBALE DI VIOLAZIONE
// ═══════════════════════════════════════════════════════════════════
export async function generateViolationDocx({
  violation, tenantName = "Comando Polizia Locale"
}: { violation: any; tenantName?: string }): Promise<Uint8Array> {
  const children: DocSection[] = []
  children.push(
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [b(`POLIZIA LOCALE - ${tenantName.toUpperCase()}`, NAVY, 26)] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [b("VERBALE DI CONTESTAZIONE", NAVY, 22)] }),
    new Paragraph({ spacing: { after: 60 }, children: [t(`Nr. Verbale: ${violation.id}  |  Stato: ${violation.stato || "EMESSO"}  |  Data: ${fmt(violation.createdAt)}`, "666666")] }),
  )

  // Dati del trasgressore
  children.push(heading1("1. TRASGRESSORE"))
  children.push(new Paragraph({
    spacing: { after: 60 },
    children: [
      t(`Nome: ${violation.trasgressoreNome || "N/D"} ${violation.trasgressoreCognome || ""}`, "333333"),
      violation.trasgressoreDataNascita ? t(`\nNato il ${fmt(violation.trasgressoreDataNascita, "dd/MM/yyyy")} a ${violation.trasgressoreLuogoNascita || "N/D"}`, "333333") : new TextRun({ text: "" }),
      violation.trasgressoreIndirizzo ? t(`\nResidenza: ${violation.trasgressoreIndirizzo}${violation.trasgressoreComuneResidenza ? " — " + violation.trasgressoreComuneResidenza : ""}`, "333333") : new TextRun({ text: "" }),
    ]
  }))

  // Dati del veicolo
  if (violation.targa) {
    children.push(heading1("2. VEICOLO"))
    children.push(new Paragraph({
      spacing: { after: 60 },
      children: [
        t(`Targa: ${violation.targa}`, "333333"),
        violation.tipoVeicolo ? t(`\nTipo: ${violation.tipoVeicolo}  |  Marca: ${violation.marcaVeicolo || "N/D"}  |  Modello: ${violation.modelloVeicolo || "N/D"}  |  Colore: ${violation.coloreVeicolo || "N/D"}`, "333333") : new TextRun({ text: "" }),
      ]
    }))
  }

  // Infrazione
  children.push(heading1("3. INFRAZIONE"))
  children.push(new Paragraph({
    spacing: { after: 60 },
    children: [
      b(`Art. ${violation.articoloCDS || "N/D"} C.d.S. — ${violation.tipoInfrazione || "N/D"}`, "8B0000", 20),
      t(`\nImporto: € ${violation.importo?.toFixed(2) || "0.00"}`, "333333"),
      violation.puntiPatente ? t(`\nPunti Patente decurtati: ${violation.puntiPatente}`, "333333") : new TextRun({ text: "" }),
    ]
  }))

  if (violation.indirizzo) {
    children.push(heading1("4. LUOGO DELLA VIOLAZIONE"))
    children.push(new Paragraph({ spacing: { after: 60 }, children: [t(violation.indirizzo, "333333")] }))
  }

  if (violation.note) {
    children.push(heading1("5. NOTE"))
    children.push(new Paragraph({ spacing: { after: 60 }, children: [t(violation.note, "333333")] }))
  }

  if (violation.motivoMancataContestazione) {
    children.push(heading1("6. MOTIVO MANCATA CONTESTAZIONE"))
    children.push(new Paragraph({ spacing: { after: 60 }, children: [t(violation.motivoMancataContestazione, "333333")] }))
  }

  // Patente
  if (violation.patenteNumero) {
    children.push(heading1("7. PATENTE"))
    children.push(new Paragraph({
      spacing: { after: 60 },
      children: [
        t(`Numero: ${violation.patenteNumero}  |  Cat: ${violation.patenteCategoria || "N/D"}`, "333333"),
        violation.patenteEnteRilascio ? t(`\nRilasciata da: ${violation.patenteEnteRilascio} il ${fmt(violation.patenteDataRilascio, "dd/MM/yyyy")}  |  Scadenza: ${fmt(violation.patenteDataScadenza, "dd/MM/yyyy")}`, "333333") : new TextRun({ text: "" }),
      ]
    }))
  }

  // Obbligato in solido
  if (violation.obbligatoNome) {
    children.push(heading1("8. OBBLIGATO IN SOLIDO"))
    children.push(new Paragraph({
      spacing: { after: 60 },
      children: [t(`${violation.obbligatoNome} ${violation.obbligatoCognome || ""} — ${violation.obbligatoIndirizzo || ""} ${violation.obbligatoComuneResidenza || ""}`, "333333")]
    }))
  }

  // Firme
  children.push(heading1("9. SOTTOSCRIZIONE"))
  children.push(new Paragraph({ spacing: { before: 200, after: 40 }, children: [t("Firma dell'Agente Accertatore: _________________________", "333333", 19)] }))
  children.push(new Paragraph({ spacing: { after: 40 }, children: [t("Firma del Trasgressore: _________________________", "333333", 19)] }))
  children.push(new Paragraph({ children: [t(`Data: ____/____/________    Luogo: _________________________`, "333333", 19)] }))

  const doc = new Document({
    styles: {
      default: { document: { run: { font: "Arial", size: 20 } } },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 24, bold: true, color: WHITE, font: "Arial" },
          paragraph: { spacing: { before: 280, after: 140 }, outlineLevel: 0 } },
      ]
    },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1000, right: 900, bottom: 1000, left: 900 } } },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: NAVY, space: 4 } },
            children: [b(`${tenantName.toUpperCase()} — Ufficio Verbali  `, NAVY, 14)]
          })]
        })
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: NAVY, space: 4 } },
            children: [t("Documento informatico ai sensi del CAD  |  Pagina ", "888888", 14), new TextRun({ children: [PageNumber.CURRENT], color: "888888", size: 14, font: "Arial" })]
          })]
        })
      },
      children
    }]
  })
  const buf = await Packer.toBuffer(doc)
  return new Uint8Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))
}
