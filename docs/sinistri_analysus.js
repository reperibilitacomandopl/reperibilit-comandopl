bash

cat > /home/claude / sinistri_fix.js << 'JSEOF'
const {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
    ShadingType, VerticalAlign, PageNumber, PageBreak, LevelFormat,
    ExternalHyperlink
} = require('docx');
const fs = require('fs');

// ─── COLOURS ───────────────────────────────────────────────────────────────
const BLU = "1A3A6B";
const BLU_L = "D6E4F7";
const BLU_M = "2E5FA3";
const GRY = "F5F6FA";
const GRN = "1A6B3A";
const GRN_L = "E8F5E9";  // light green background
const ORG = "B45309";
const ORG_L = "FFF3CD";  // light orange background (was ORG+"22")
const RED = "8B0000";
const RED_L = "FDECEA";  // light red background (was RED+"22")
const WHT = "FFFFFF";

// ─── HELPERS ───────────────────────────────────────────────────────────────
const b = (txt, color = "000000", sz = 22) => new TextRun({ text: txt, bold: true, color, size: sz, font: "Arial" });
const t = (txt, color = "1A1A1A", sz = 20) => new TextRun({ text: txt, bold: false, color, size: sz, font: "Arial" });
const it = (txt, color = "444444", sz = 19) => new TextRun({ text: txt, bold: false, color, size: sz, font: "Arial", italics: true });

const border1 = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border1, bottom: border1, left: border1, right: border1 };
const noBorder = { style: BorderStyle.NIL, size: 0, color: "FFFFFF" };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

const cell = (children, opts = {}) => new TableCell({
    borders,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR } : undefined,
    width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    children
});

const hdrCell = (txt, fill = BLU, width) => cell(
    [new Paragraph({ alignment: AlignmentType.CENTER, children: [b(txt, WHT, 19)] })],
    { fill, width }
);

const p = (children, opts = {}) => new Paragraph({
    children,
    alignment: opts.align || AlignmentType.LEFT,
    spacing: { before: opts.before || 0, after: opts.after || 120 },
    ...(opts.numbering ? { numbering: opts.numbering } : {}),
    ...(opts.indent ? { indent: opts.indent } : {}),
    border: opts.border || undefined
});

const heading1 = (txt) => new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 320, after: 160 },
    children: [b(txt, WHT, 26)],
    shading: { fill: BLU, type: ShadingType.CLEAR },
    indent: { left: 120 },
});

const heading2 = (txt) => new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BLU_M, space: 1 } },
    children: [b(txt, BLU_M, 23)],
});

const heading3 = (txt) => new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 80 },
    children: [b(txt, "2E5FA3", 21)],
});

const noteBox = (txt, fill = BLU_L, color = BLU) => new Paragraph({
    spacing: { before: 100, after: 100 },
    indent: { left: 200, right: 200 },
    shading: { fill, type: ShadingType.CLEAR },
    border: { left: { style: BorderStyle.SINGLE, size: 12, color, space: 8 } },
    children: [it(txt, color, 19)]
});

const bullet = (txt, ref = "bul") => p(
    [t(txt)],
    { before: 40, after: 40, numbering: { reference: ref, level: 0 } }
);

const sub = (txt) => p(
    [it("→  " + txt, "555555", 19)],
    { indent: { left: 480 }, before: 20, after: 20 }
);

const spacer = (n = 1) => Array(n).fill(new Paragraph({ children: [new TextRun("")], spacing: { before: 40, after: 40 } }));

// ─── SCHEMA TABLE helper ────────────────────────────────────────────────────
const schemaRow = (field, type, req, desc, fill) => new TableRow({
    children: [
        cell([p([b(field, "1A3A6B", 18)])], { fill: fill || WHT, width: 2000 }),
        cell([p([t(type, "5B21B6", 18)])], { fill: fill || WHT, width: 2000 }),
        cell([p([t(req, "B45309", 18)])], { fill: fill || WHT, width: 800 }),
        cell([p([t(desc, "333333", 18)])], { fill: fill || WHT, width: 4200 }),
    ]
});

const schemaHdr = () => new TableRow({
    tableHeader: true,
    children: [
        hdrCell("Campo", BLU, 2000),
        hdrCell("Tipo / Enum", BLU, 2000),
        hdrCell("Req.", BLU, 800),
        hdrCell("Descrizione", BLU, 4200),
    ]
});

// ─── API TABLE helper ───────────────────────────────────────────────────────
const apiRow = (method, endpoint, desc, auth, fill) => new TableRow({
    children: [
        cell([p([b(method, method === "GET" ? GRN : method === "POST" ? "1A3A6B" : method === "PATCH" ? ORG : RED, 18)])], { fill: fill || WHT, width: 900 }),
        cell([p([t(endpoint, "1A1A1A", 17)])], { fill: fill || WHT, width: 3600 }),
        cell([p([t(desc, "333333", 18)])], { fill: fill || WHT, width: 3200 }),
        cell([p([it(auth, "5B21B6", 17)])], { fill: fill || WHT, width: 1400 }),
    ]
});

const apiHdr = () => new TableRow({
    tableHeader: true,
    children: [
        hdrCell("Metodo", BLU, 900), hdrCell("Endpoint", BLU, 3600),
        hdrCell("Descrizione", BLU, 3200), hdrCell("Auth/Ruolo", BLU, 1400)
    ]
});

// ══════════════════════════════════════════════════════════════════════════════
const numbering = {
    config: [
        {
            reference: "bul", levels: [{
                level: 0, format: LevelFormat.BULLET, text: "•",
                alignment: AlignmentType.LEFT,
                style: { paragraph: { indent: { left: 480, hanging: 240 }, spacing: { before: 30, after: 30 } } }
            }]
        },
        {
            reference: "num", levels: [{
                level: 0, format: LevelFormat.DECIMAL, text: "%1.",
                alignment: AlignmentType.LEFT,
                style: { paragraph: { indent: { left: 480, hanging: 240 }, spacing: { before: 30, after: 30 } } }
            }]
        },
    ]
};

const doc = new Document({
    numbering,
    styles: {
        default: { document: { run: { font: "Arial", size: 20 } } },
        paragraphStyles: [
            {
                id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
                run: { size: 26, bold: true, color: WHT, font: "Arial" },
                paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 0 }
            },
            {
                id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
                run: { size: 23, bold: true, color: BLU_M, font: "Arial" },
                paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 1 }
            },
            {
                id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
                run: { size: 21, bold: true, color: BLU_M, font: "Arial" },
                paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 2 }
            },
        ]
    },
    sections: [{
        properties: {
            page: {
                size: { width: 11906, height: 16838 },
                margin: { top: 1000, right: 900, bottom: 1000, left: 900 }
            }
        },
        headers: {
            default: new Header({
                children: [
                    new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLU, space: 1 } },
                        spacing: { after: 120 },
                        children: [
                            b("ANALISI TECNICA — MODULO SINISTRI STRADALI  ", BLU, 18),
                            t("Piattaforma SaaS Polizia Locale", "666666", 17)
                        ]
                    })
                ]
            })
        },
        footers: {
            default: new Footer({
                children: [
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        border: { top: { style: BorderStyle.SINGLE, size: 4, color: BLU, space: 4 } },
                        spacing: { before: 80 },
                        children: [
                            t("Documento riservato — uso interno sviluppo  |  Pagina ", "888888", 17),
                            new TextRun({ children: [PageNumber.CURRENT], color: "888888", size: 17, font: "Arial" }),
                            t("  di  ", "888888", 17),
                            new TextRun({ children: [PageNumber.TOTAL_PAGES], color: "888888", size: 17, font: "Arial" }),
                        ]
                    })
                ]
            })
        },
        children: [

            // ══════════════════ COPERTINA ═════════════════════════════════════════════════
            new Paragraph({
                spacing: { before: 600, after: 80 }, alignment: AlignmentType.CENTER,
                shading: { fill: BLU, type: ShadingType.CLEAR },
                children: [b("PIATTAFORMA SaaS — POLIZIA LOCALE", WHT, 28)]
            }),
            new Paragraph({
                spacing: { before: 0, after: 0 }, alignment: AlignmentType.CENTER,
                shading: { fill: BLU, type: ShadingType.CLEAR },
                children: [b("ANALISI TECNICA DETTAGLIATA", WHT, 36)]
            }),
            new Paragraph({
                spacing: { before: 0, after: 0 }, alignment: AlignmentType.CENTER,
                shading: { fill: BLU, type: ShadingType.CLEAR },
                children: [b("MODULO SINISTRI STRADALI", "A8C8F8", 30)]
            }),
            new Paragraph({
                spacing: { before: 40, after: 200 }, alignment: AlignmentType.CENTER,
                shading: { fill: BLU, type: ShadingType.CLEAR },
                children: [t("Accident Report & Road Incident Management Module", "A8C8F8", 22)]
            }),

            new Table({
                width: { size: 9000, type: WidthType.DXA },
                columnWidths: [2200, 6800],
                rows: [
                    new TableRow({
                        children: [
                            cell([p([b("Versione", WHT, 19)])], { fill: BLU_M, width: 2200 }),
                            cell([p([t("1.0 — Prima emissione", WHT, 19)])], { fill: BLU_M, width: 6800 })
                        ]
                    }),
                    new TableRow({
                        children: [
                            cell([p([b("Data", BLU, 19)])], { fill: BLU_L, width: 2200 }),
                            cell([p([t("Maggio 2026", "333333", 19)])], { fill: BLU_L, width: 6800 })
                        ]
                    }),
                    new TableRow({
                        children: [
                            cell([p([b("Destinatario", WHT, 19)])], { fill: BLU_M, width: 2200 }),
                            cell([p([t("Team Sviluppo Backend / Frontend", WHT, 19)])], { fill: BLU_M, width: 6800 })
                        ]
                    }),
                    new TableRow({
                        children: [
                            cell([p([b("Classificazione", BLU, 19)])], { fill: BLU_L, width: 2200 }),
                            cell([p([t("Documento riservato — uso interno", "333333", 19)])], { fill: BLU_L, width: 6800 })
                        ]
                    }),
                    new TableRow({
                        children: [
                            cell([p([b("Ambito normativo", WHT, 19)])], { fill: BLU_M, width: 2200 }),
                            cell([p([t("L. 689/1981 · C.d.S. D.Lgs. 285/1992 · C.P. · D.Lgs. 196/2003 (GDPR)", WHT, 19)])], { fill: BLU_M, width: 6800 })
                        ]
                    }),
                ]
            }),

            ...spacer(1),
            noteBox("Questo documento costituisce la specifica tecnica completa per l'implementazione del Modulo Sinistri Stradali all'interno della piattaforma SaaS per la gestione dei Comandi di Polizia Locale. Ogni sezione e' redatta in modo da essere immediatamente operativa per lo sviluppatore.", BLU_L, BLU),
            ...spacer(2),

            // ══════════════════ 1. INDICE ═════════════════════════════════════════════════
            heading1("1. INDICE DEI CONTENUTI"),
            ...spacer(1),

            ...([
                ["1.", "Indice dei contenuti"],
                ["2.", "Obiettivi e contesto operativo"],
                ["3.", "Architettura generale del modulo"],
                ["4.", "Schema database Prisma — entita' estese"],
                ["5.", "Flusso operativo completo (workflow a 6 fasi)"],
                ["6.", "Gestione normativa: L. 689/1981 e Codice Penale"],
                ["7.", "Escussione conducenti, passeggeri e testimoni"],
                ["8.", "Rilievi sul posto: fotografie, misure e planimetria"],
                ["9.", "Rilevamento danni, segnaletica e particolari"],
                ["10.", "Gestione rimozione veicoli"],
                ["11.", "Scambio dati tra le parti (mail/PEC)"],
                ["12.", "Integrazione Motorizzazione Civile (MIT/DTT)"],
                ["13.", "Intervenuti esterni: VV.F., 118, altri enti"],
                ["14.", "Sviluppo dinamica del sinistro"],
                ["15.", "Stesura verbale: operatore singolo o coppia"],
                ["16.", "API Layer — endpoint CRUD"],
                ["17.", "Generazione PDF — struttura e template"],
                ["18.", "UI/UX: wizard mobile e dashboard desktop"],
                ["19.", "Sicurezza, GDPR e audit log"],
                ["20.", "Fasi di sviluppo e roadmap"],
                ["21.", "Risposte alle open questions"],
                ["22.", "Appendice: enum e costanti di riferimento"],
            ].map(([n, titolo]) => new Paragraph({
                spacing: { before: 30, after: 30 },
                numbering: { reference: "bul", level: 0 },
                children: [b(n + " ", "1A3A6B", 19), t(titolo, "333333", 19)]
            }))),

            ...spacer(1),
            new Paragraph({ children: [new PageBreak()] }),

            // ══════════════════ 2. OBIETTIVI ══════════════════════════════════════════════
            heading1("2. OBIETTIVI E CONTESTO OPERATIVO"),
            heading2("2.1 Perche' questo modulo e' strategico"),
            p([t("Il Modulo Sinistri Stradali e' la funzionalita' a piu' alto valore competitivo della piattaforma. Permette di chiudere il ciclo operativo completo: dalla centrale che invia la pattuglia, all'agente che opera su strada, fino all'ufficio infortunistica che redige atti validi a tutti gli effetti legali.")]),
            ...spacer(1),
            heading2("2.2 Utenti del sistema"),

            new Table({
                width: { size: 9000, type: WidthType.DXA }, columnWidths: [2000, 2000, 5000],
                rows: [
                    new TableRow({
                        tableHeader: true, children: [
                            hdrCell("Ruolo", BLU, 2000), hdrCell("Contesto d'uso", BLU, 2000), hdrCell("Funzionalita' principali", BLU, 5000)
                        ]
                    }),
                    ...([
                        ["Agente su Strada", "Mobile / Tablet", "Crea sinistro, geolocalizza, inserisce targhe/nomi, scatta foto, raccoglie dichiarazioni"],
                        ["Agente Infortunistica", "Desktop (ufficio)", "Completa il fascicolo, inserisce rilievi metrici, verifica assicurazioni, genera verbali"],
                        ["Ufficiale / Comandante", "Desktop", "Revisiona, approva, firma digitale, chiude il fascicolo, firma verbali penali"],
                        ["Operatore Centrale", "Desktop", "Riceve segnalazione, invia pattuglia, collega intervento al sinistro"],
                        ["Amministratore SaaS", "Backoffice", "Configurazione template PDF, integrazioni esterne, gestione permessi tenant"],
                    ].map(([r, c, f], i) => new TableRow({
                        children: [
                            cell([p([b(r, "1A3A6B", 18)])], { fill: i % 2 === 0 ? WHT : GRY, width: 2000 }),
                            cell([p([t(c, "555555", 18)])], { fill: i % 2 === 0 ? WHT : GRY, width: 2000 }),
                            cell([p([t(f, "333333", 18)])], { fill: i % 2 === 0 ? WHT : GRY, width: 5000 }),
                        ]
                    })))
                ]
            }),

            ...spacer(2),
            new Paragraph({ children: [new PageBreak()] }),

            // ══════════════════ 3. ARCHITETTURA ═══════════════════════════════════════════
            heading1("3. ARCHITETTURA GENERALE DEL MODULO"),
            heading2("3.1 Stack tecnologico consigliato"),
            bullet("Backend: Node.js / TypeScript · Prisma ORM · PostgreSQL"),
            bullet("API: REST con autenticazione JWT + refresh token per sessioni mobile"),
            bullet("Storage file: servizio S3-compatibile (MinIO self-hosted o AWS S3/Wasabi)"),
            bullet("Generazione PDF: Puppeteer (HTML→PDF) o pdf-lib per template statici"),
            bullet("Email / PEC: Nodemailer + provider SMTP configurabile per tenant"),
            bullet("Integrazione MIT: client HTTP verso Web Services DTT (autenticazione certificato)"),
            bullet("Notifiche real-time: WebSocket (Socket.io) per aggiornamenti stato"),
            ...spacer(1),

            heading2("3.2 Entita' principali e relazioni"),
            noteBox("AccidentReport (1) --< AccidentVehicle (N) --< AccidentPerson (N)  |  AccidentReport --< AccidentSurvey --< AccidentPhoto (N)  |  AccidentReport --< AccidentDeclaration (N)  |  AccidentReport --< AccidentExternalUnit  |  AccidentReport --< AccidentDocument  |  AccidentReport >-- Officer (firmatario 1 o 2)", BLU_L, BLU),
            ...spacer(2),
            new Paragraph({ children: [new PageBreak()] }),

            // ══════════════════ 4. SCHEMA PRISMA ══════════════════════════════════════════
            heading1("4. SCHEMA DATABASE PRISMA — ENTITA' ESTESE"),
            heading2("4.1 AccidentReport — Fascicolo principale"),

            new Table({
                width: { size: 9000, type: WidthType.DXA }, columnWidths: [2000, 2000, 800, 4200],
                rows: [
                    schemaHdr(),
                    schemaRow("id", "String (UUID)", "Si", "Chiave primaria UUID v4"),
                    schemaRow("tenantId", "String", "Si", "FK → Comando (multi-tenancy)", "F5F6FA"),
                    schemaRow("protocolNumber", "String (unique)", "Auto", "Es. SIN-2026-0001, generato server-side"),
                    schemaRow("date", "DateTime", "Si", "Data/ora incidente (UTC, display locale)", "F5F6FA"),
                    schemaRow("receivedAt", "DateTime", "", "Ora ricezione chiamata/segnalazione"),
                    schemaRow("arrivedAt", "DateTime", "", "Ora arrivo pattuglia sul posto", "F5F6FA"),
                    schemaRow("closedAt", "DateTime", "", "Ora chiusura intervento sul posto"),
                    schemaRow("address", "String", "Si", "Indirizzo completo testuale", "F5F6FA"),
                    schemaRow("lat", "Float", "", "Latitudine GPS"),
                    schemaRow("lng", "Float", "", "Longitudine GPS", "F5F6FA"),
                    schemaRow("locationNotes", "String", "", "Note aggiuntive localizzazione"),
                    schemaRow("severity", "Enum", "Si", "SOLO_DANNI | FERITI | MORTALE | RISERVA_PROGNOSI", "F5F6FA"),
                    schemaRow("weatherCondition", "Enum", "Si", "SERENO | NUVOLOSO | PIOGGIA | NEBBIA | NEVE | GRANDINE"),
                    schemaRow("roadCondition", "Enum", "Si", "ASCIUTTA | BAGNATA | GHIACCIATA | INNEVATA | DISSESTATA | OLIO", "F5F6FA"),
                    schemaRow("lightCondition", "Enum", "Si", "GIORNO | CREPUSCOLO | NOTTE_ILLUMINATA | NOTTE_NON_ILLUMINATA"),
                    schemaRow("trafficCondition", "Enum", "", "SCORREVOLE | INTENSO | CONGESTIONATO | ASSENTE", "F5F6FA"),
                    schemaRow("dynamicDescription", "Text", "Si", "Ricostruzione dinamica narrativa"),
                    schemaRow("dynamicDiagramUrl", "String", "", "URL SVG/PNG planimetria dinamica", "F5F6FA"),
                    schemaRow("status", "Enum", "Si", "BOZZA | IN_COMPILAZIONE | REVISIONATO | CHIUSO | ANNULLATO"),
                    schemaRow("legalFramework", "Enum", "", "CIVILE | PENALE | ENTRAMBI", "F5F6FA"),
                    schemaRow("penalArticles", "String[]", "", "Array art. CP applicati (es. [590-bis, 575])"),
                    schemaRow("administrativeRef", "String", "", "Riferimento procedimento L.689/1981", "F5F6FA"),
                    schemaRow("interventionId", "String?", "", "FK opzionale → Intervention (Centrale Operativa)"),
                    schemaRow("reportingOfficerId", "String", "Si", "FK → Officer (primo firmatario / capo pattuglio)", "F5F6FA"),
                    schemaRow("secondOfficerId", "String?", "", "FK → Officer (secondo firmatario, opzionale)"),
                    schemaRow("supervisorId", "String?", "", "FK → Officer (Ufficiale validatore)", "F5F6FA"),
                    schemaRow("istatCode", "String?", "", "Codice ISTAT incidente per export prefettura"),
                    schemaRow("istatExportedAt", "DateTime?", "", "Data export ISTAT", "F5F6FA"),
                    schemaRow("notes", "Text?", "", "Note interne (non stampate nel PDF pubblico)"),
                    schemaRow("createdAt", "DateTime", "Auto", "Timestamp creazione", "F5F6FA"),
                    schemaRow("updatedAt", "DateTime", "Auto", "Timestamp ultima modifica"),
                ]
            }),

            ...spacer(1),
            heading2("4.2 AccidentVehicle — Veicoli coinvolti"),
            new Table({
                width: { size: 9000, type: WidthType.DXA }, columnWidths: [2000, 2000, 800, 4200],
                rows: [
                    schemaHdr(),
                    schemaRow("id", "String (UUID)", "Si", ""),
                    schemaRow("accidentId", "String", "Si", "FK → AccidentReport", "F5F6FA"),
                    schemaRow("vehicleNumber", "Int", "Auto", "Numero progressivo (Veicolo A, B, C...)"),
                    schemaRow("licensePlate", "String", "Si", "Targa (validata formato IT/EU)", "F5F6FA"),
                    schemaRow("vehicleType", "Enum", "Si", "AUTO|MOTO|CICLOMOTORE|CAMION|FURGONE|BUS|BICI|MONOPATTINO|ALTRO"),
                    schemaRow("brand", "String", "", "Marca (da MIT o inserimento manuale)", "F5F6FA"),
                    schemaRow("model", "String", "", "Modello"),
                    schemaRow("color", "String", "", "Colore", "F5F6FA"),
                    schemaRow("registrationYear", "Int", "", "Anno immatricolazione"),
                    schemaRow("vinNumber", "String?", "", "Numero telaio (VIN)", "F5F6FA"),
                    schemaRow("ownerName", "String", "", "Proprietario (da MIT)"),
                    schemaRow("ownerFiscalCode", "String", "", "Codice fiscale proprietario", "F5F6FA"),
                    schemaRow("ownerAddress", "String", "", "Residenza proprietario"),
                    schemaRow("insuranceCompany", "String", "Si", "Compagnia assicurativa", "F5F6FA"),
                    schemaRow("insurancePolicy", "String", "Si", "Numero polizza RC"),
                    schemaRow("insuranceExpiry", "DateTime", "", "Scadenza polizza", "F5F6FA"),
                    schemaRow("insuranceValid", "Boolean", "", "Esito verifica (da MIT/SITA)"),
                    schemaRow("revisionExpiry", "DateTime", "", "Scadenza revisione periodica", "F5F6FA"),
                    schemaRow("mitDataFetchedAt", "DateTime?", "", "Timestamp interrogazione MIT"),
                    schemaRow("damageDescription", "Text", "", "Descrizione danni riportati", "F5F6FA"),
                    schemaRow("damageZones", "Json", "", "Array zone danneggiate (es. anteriore_dx, airbag)"),
                    schemaRow("towingRequired", "Boolean", "No", "Necessita' rimozione/carro attrezzi", "F5F6FA"),
                    schemaRow("towingCompany", "String?", "", "Ditta carro attrezzi"),
                    schemaRow("towingAt", "DateTime?", "", "Ora rimozione", "F5F6FA"),
                    schemaRow("depositLocation", "String?", "", "Luogo deposito veicolo rimosso"),
                    schemaRow("position", "Enum", "", "VEICOLO_A | VEICOLO_B | VEICOLO_C — per planimetria", "F5F6FA"),
                ]
            }),

            ...spacer(1),
            heading2("4.3 AccidentPerson — Persone coinvolte"),
            new Table({
                width: { size: 9000, type: WidthType.DXA }, columnWidths: [2000, 2000, 800, 4200],
                rows: [
                    schemaHdr(),
                    schemaRow("id", "String (UUID)", "Si", ""),
                    schemaRow("accidentId", "String", "Si", "FK → AccidentReport", "F5F6FA"),
                    schemaRow("vehicleId", "String?", "", "FK → AccidentVehicle (null per pedoni/testimoni)"),
                    schemaRow("role", "Enum", "Si", "CONDUCENTE|PASSEGGERO|PEDONE|TESTIMONE|ALTRO", "F5F6FA"),
                    schemaRow("firstName", "String", "Si", ""),
                    schemaRow("lastName", "String", "Si", "", "F5F6FA"),
                    schemaRow("fiscalCode", "String", "Si", "Codice fiscale (validazione algoritmo)"),
                    schemaRow("birthDate", "DateTime", "Si", "", "F5F6FA"),
                    schemaRow("birthPlace", "String", "", "Luogo di nascita"),
                    schemaRow("nationality", "String", "", "Nazionalita'", "F5F6FA"),
                    schemaRow("documentType", "Enum", "", "CI|PASSAPORTO|PATENTE|PERMESSO_SOGGIORNO"),
                    schemaRow("documentNumber", "String", "", "Numero documento identita'", "F5F6FA"),
                    schemaRow("address", "String", "", "Indirizzo di residenza"),
                    schemaRow("phone", "String", "", "Telefono (cifrato a riposo)", "F5F6FA"),
                    schemaRow("email", "String", "", "Email (cifrato a riposo)"),
                    schemaRow("licenseNumber", "String?", "", "Numero patente (solo conducenti)", "F5F6FA"),
                    schemaRow("licenseCategory", "String?", "", "Categoria patente (A, B, C, D, BE...)"),
                    schemaRow("licenseExpiry", "DateTime?", "", "Scadenza patente", "F5F6FA"),
                    schemaRow("licenseValid", "Boolean?", "", "Verifica validita' patente (MIT)"),
                    schemaRow("injuries", "Enum?", "", "NESSUNA|LIEVE|GRAVE|GRAVISSIMA|DECEDUTO", "F5F6FA"),
                    schemaRow("injuryDescription", "Text?", "", "Descrizione lesioni/prognosi"),
                    schemaRow("hospitalSentTo", "String?", "", "Ospedale/pronto soccorso indicato", "F5F6FA"),
                    schemaRow("transportedBy", "Enum?", "", "AUTO_PROPRIA|118|PRIVATO|DECEDUTO_SUL_POSTO"),
                    schemaRow("alcoholTestDone", "Boolean", "", "Alcoltest effettuato", "F5F6FA"),
                    schemaRow("alcoholTestResult", "Float?", "", "Valore in g/L (rilevante per art. 186 CdS)"),
                    schemaRow("drugTestDone", "Boolean", "", "Test stupefacenti effettuato (art. 187 CdS)", "F5F6FA"),
                    schemaRow("drugTestResult", "String?", "", "Esito (Positivo/Negativo/In attesa)"),
                    schemaRow("declarationId", "String?", "", "FK → AccidentDeclaration (sua dichiarazione)", "F5F6FA"),
                    schemaRow("refused689", "Boolean", "", "Ha rifiutato di rilasciare dichiarazioni (L.689/81)"),
                    schemaRow("notified689At", "DateTime?", "", "Ora notifica diritti L.689/81", "F5F6FA"),
                ]
            }),

            ...spacer(1),
            heading2("4.4 AccidentDeclaration — Dichiarazioni rese"),
            new Table({
                width: { size: 9000, type: WidthType.DXA }, columnWidths: [2000, 2000, 800, 4200],
                rows: [
                    schemaHdr(),
                    schemaRow("id", "String (UUID)", "Si", ""),
                    schemaRow("accidentId", "String", "Si", "FK → AccidentReport", "F5F6FA"),
                    schemaRow("personId", "String", "Si", "FK → AccidentPerson"),
                    schemaRow("type", "Enum", "Si", "SPONTANEA|SU_INVITO|RIFIUTO|S.I.T. (art.351 cpp)", "F5F6FA"),
                    schemaRow("content", "Text", "Si", "Testo integrale dichiarazione"),
                    schemaRow("recordedAt", "DateTime", "Si", "Data/ora acquisizione", "F5F6FA"),
                    schemaRow("recordedByOfficerId", "String", "Si", "FK → Officer che ha raccolto la dichiarazione"),
                    schemaRow("signedByPerson", "Boolean", "", "Firmata dall'interessato", "F5F6FA"),
                    schemaRow("signatureImageUrl", "String?", "", "URL firma digitalizzata (se tablet)"),
                    schemaRow("legalWarningGiven", "Boolean", "Si", "Ammonizione art. 64 cpp resa (per S.I.T.)", "F5F6FA"),
                    schemaRow("refused", "Boolean", "", "Ha rifiutato di firmare/dichiarare"),
                ]
            }),

            ...spacer(1),
            heading2("4.5 AccidentSurvey — Rilievi tecnici sul posto"),
            new Table({
                width: { size: 9000, type: WidthType.DXA }, columnWidths: [2000, 2000, 800, 4200],
                rows: [
                    schemaHdr(),
                    schemaRow("id", "String (UUID)", "Si", ""),
                    schemaRow("accidentId", "String", "Si", "FK → AccidentReport", "F5F6FA"),
                    schemaRow("roadType", "Enum", "Si", "URBANA|EXTRAURBANA|AUTOSTRADA|PISTA_CICLABILE"),
                    schemaRow("roadName", "String", "", "Nome via/strada", "F5F6FA"),
                    schemaRow("roadWidth", "Float?", "", "Larghezza carreggiata (m)"),
                    schemaRow("laneCount", "Int?", "", "Numero corsie", "F5F6FA"),
                    schemaRow("speedLimit", "Int?", "", "Limite di velocita' (km/h)"),
                    schemaRow("slopeType", "Enum?", "", "PIANO|SALITA|DISCESA|CURVA", "F5F6FA"),
                    schemaRow("slopePercent", "Float?", "", "Pendenza percentuale"),
                    schemaRow("impactZoneDesc", "Text", "Si", "Descrizione zona d'impatto", "F5F6FA"),
                    schemaRow("impactMeasures", "Json", "", "Array misure: [{label,value,unit,fromRef}]"),
                    schemaRow("skidMarksLength", "Float?", "", "Lunghezza tracce frenata (m)", "F5F6FA"),
                    schemaRow("debrisDescription", "Text?", "", "Detriti/frammenti rilevati"),
                    schemaRow("signagePresent", "String[]", "", "Segnaletica verticale presente (array)", "F5F6FA"),
                    schemaRow("signageDamaged", "Boolean", "", "Segnaletica danneggiata/mancante"),
                    schemaRow("roadMarkingsPresent", "Boolean", "", "Segnaletica orizzontale presente", "F5F6FA"),
                    schemaRow("trafficLightPresent", "Boolean", "", "Presenza semaforo"),
                    schemaRow("trafficLightWorking", "Boolean?", "", "Semaforo funzionante al momento", "F5F6FA"),
                    schemaRow("guardRailDamaged", "Boolean", "", "Guard-rail/new jersey danneggiato"),
                    schemaRow("publicLightingDamaged", "Boolean", "", "Illuminazione pubblica danneggiata", "F5F6FA"),
                    schemaRow("otherDamages", "Text?", "", "Danni ad infrastrutture, terze proprieta'"),
                    schemaRow("surveyedByOfficerId", "String", "Si", "FK → Officer che ha effettuato i rilievi", "F5F6FA"),
                    schemaRow("surveyedAt", "DateTime", "Si", "Data/ora rilievi"),
                ]
            }),

            ...spacer(1),
            heading2("4.6 AccidentPhoto — Fotografie allegate"),
            new Table({
                width: { size: 9000, type: WidthType.DXA }, columnWidths: [2000, 2000, 800, 4200],
                rows: [
                    schemaHdr(),
                    schemaRow("id", "String (UUID)", "Si", ""),
                    schemaRow("accidentId", "String", "Si", "FK → AccidentReport", "F5F6FA"),
                    schemaRow("surveyId", "String?", "", "FK → AccidentSurvey (contestualizza la foto)"),
                    schemaRow("url", "String", "Si", "URL S3-compatibile (firmato temporaneamente)", "F5F6FA"),
                    schemaRow("thumbnailUrl", "String", "", "URL thumbnail generata server-side"),
                    schemaRow("category", "Enum", "Si", "PANORAMICA|VEICOLO|DANNI|SEGNALETICA|TRACCE|PLANIMETRIA|ALTRO", "F5F6FA"),
                    schemaRow("caption", "String", "", "Didascalia libera"),
                    schemaRow("sequence", "Int", "", "Numero d'ordine nella relazione", "F5F6FA"),
                    schemaRow("takenAt", "DateTime", "", "Timestamp EXIF o inserimento"),
                    schemaRow("takenByOfficerId", "String", "Si", "FK → Officer", "F5F6FA"),
                    schemaRow("gpsLat", "Float?", "", "GPS EXIF latitudine"),
                    schemaRow("gpsLng", "Float?", "", "GPS EXIF longitudine", "F5F6FA"),
                    schemaRow("includeInReport", "Boolean", "Si", "Se includere nel PDF finale"),
                ]
            }),

            ...spacer(1),
            heading2("4.7 AccidentExternalUnit — Enti intervenuti"),
            new Table({
                width: { size: 9000, type: WidthType.DXA }, columnWidths: [2000, 2000, 800, 4200],
                rows: [
                    schemaHdr(),
                    schemaRow("id", "String (UUID)", "Si", ""),
                    schemaRow("accidentId", "String", "Si", "FK → AccidentReport", "F5F6FA"),
                    schemaRow("unitType", "Enum", "Si", "VVF|118|POLIZIA_STATO|CARABINIERI|GDF|ANAS|COMUNE|ALTRO"),
                    schemaRow("unitName", "String", "", "Es. Vigili del Fuoco - Distaccamento Nord", "F5F6FA"),
                    schemaRow("unitIdentifier", "String?", "", "Numero mezzo/squadra"),
                    schemaRow("arrivedAt", "DateTime", "", "Ora arrivo sul posto", "F5F6FA"),
                    schemaRow("leftAt", "DateTime?", "", "Ora partenza dal posto"),
                    schemaRow("officerInCharge", "String?", "", "Nome responsabile ente intervenuto", "F5F6FA"),
                    schemaRow("actionsPerformed", "Text", "", "Descrizione operazioni svolte"),
                    schemaRow("reportNumber", "String?", "", "Numero rapporto/intervento ente esterno", "F5F6FA"),
                    schemaRow("notes", "Text?", "", "Note aggiuntive"),
                ]
            }),

            ...spacer(2),
            new Paragraph({ children: [new PageBreak()] }),

            // ══════════════════ 5. WORKFLOW ════════════════════════════════════════════════
            heading1("5. FLUSSO OPERATIVO COMPLETO — 6 FASI"),

            heading2("FASE 1 — Ricezione segnalazione e arrivo sul posto"),
            bullet("L'agente apre l'app mobile, seleziona 'Nuovo Sinistro'"),
            bullet("Il GPS geolocalizza automaticamente la posizione (lat/lng + reverse geocoding)"),
            bullet("Si inseriscono i dati essenziali: data/ora, numero veicoli coinvolti, stima gravita'"),
            bullet("Il sistema genera automaticamente il protocolNumber univoco (es. SIN-2026-0047)"),
            bullet("Se l'intervento e' stato inviato dalla Centrale, appare il link all'Intervention correlato"),
            noteBox("TIMING: Il sistema registra automaticamente arrivedAt al momento della creazione se non gia' presente dall'Intervention. L'agente puo' modificare manualmente sia receivedAt che arrivedAt.", BLU_L, BLU),

            ...spacer(1),
            heading2("FASE 2 — Identificazione persone e veicoli"),
            bullet("Inserimento targa → interrogazione automatica MIT/DTT per dati veicolo, proprietario, assicurazione, revisione"),
            bullet("Inserimento dati conducente (CF, documento, patente) → verifica validita' patente via MIT"),
            bullet("Inserimento eventuali passeggeri con ruolo e dati anagrafici"),
            bullet("Segnalazione eventuali pedoni coinvolti"),
            bullet("Identificazione testimoni presenti"),
            noteBox("I dati assicurativi vengono verificati in tempo reale tramite il sistema SITA-SIV del MIT. In caso di mancata copertura assicurativa, il sistema evidenzia l'alert e suggerisce la norma applicabile (art. 193 CdS).", ORG_L, ORG),

            ...spacer(1),
            heading2("FASE 3 — Escussione dichiarazioni (L.689/1981 e C.P.)"),
            bullet("Per procedimenti amministrativi (L.689/81): notifica dei diritti, raccolta dichiarazione spontanea o su invito"),
            bullet("Per procedimenti penali (C.P./C.p.p.): S.I.T. ex art. 351 C.p.p. con ammonizione art. 64 C.p.p."),
            bullet("Ogni dichiarazione e' timestampata, associata all'agente che la raccoglie e al soggetto dichiarante"),
            bullet("Gestione del rifiuto a dichiarare (con relativa annotazione verbale)"),
            bullet("Possibilita' di firma digitale su tablet o annotazione firmato/non firmato"),

            ...spacer(1),
            heading2("FASE 4 — Rilievi tecnici sul posto"),
            bullet("Descrizione geometria stradale (larghezza, corsie, pendenza, tipo strada)"),
            bullet("Misure metriche zona d'impatto (inserimento tabellare strutturato)"),
            bullet("Tracce di frenata (lunghezza, posizione)"),
            bullet("Danni a segnaletica, guard-rail, illuminazione pubblica, terze proprieta'"),
            bullet("Fotografie categorizzate con didascalia e numero d'ordine"),
            bullet("Planimetria/schizzo (upload foto manuale o SVG interattivo)"),

            ...spacer(1),
            heading2("FASE 5 — Completamento in ufficio"),
            bullet("Completare la narrativa della dinamica (editor di testo ricco)"),
            bullet("Allegare documenti firmati, verbali scansionati"),
            bullet("Verificare e completare i dati MIT scaricati"),
            bullet("Effettuare invio dati alle parti via email/PEC"),
            bullet("Compilare i dati per export ISTAT"),

            ...spacer(1),
            heading2("FASE 6 — Revisione, firma e chiusura"),
            bullet("L'Ufficiale esamina il fascicolo completo in modalita' revisione"),
            bullet("Aggiunge eventuali annotazioni o richieste di integrazione"),
            bullet("Approva il verbale scegliendo tra firma singola o firma doppia"),
            bullet("Appone la propria validazione (supervisorId)"),
            bullet("Pone il sinistro in stato CHIUSO, bloccando ulteriori modifiche"),
            bullet("Genera il PDF finale per stampa/archiviazione/invio"),

            ...spacer(2),
            new Paragraph({ children: [new PageBreak()] }),

            // ══════════════════ 6. NORMATIVA ══════════════════════════════════════════════
            heading1("6. GESTIONE NORMATIVA: L. 689/1981 E CODICE PENALE"),

            heading2("6.1 Legge 689/1981 — Depenalizzazione"),
            bullet("Notifica dei diritti al trasgressore (art. 14 L.689/81): registrazione notified689At"),
            bullet("Campo refused689 sull'AccidentPerson: soggetto si e' avvalso della facolta' di non rispondere"),
            bullet("Riferimento al procedimento sanzionatorio amministrativo: campo administrativeRef"),
            bullet("Generazione dell'atto di contestazione/notifica integrato nel PDF del verbale"),
            noteBox("Il sistema deve prevedere un flag legalFramework = CIVILE | PENALE | ENTRAMBI per determinare quale template di verbale generare e quali campi normativi sono obbligatori.", BLU_L, BLU),

            ...spacer(1),
            heading2("6.2 Codice Penale — Principali articoli applicabili"),

            new Table({
                width: { size: 9000, type: WidthType.DXA }, columnWidths: [1400, 2200, 5400],
                rows: [
                    new TableRow({ tableHeader: true, children: [hdrCell("Articolo", BLU, 1400), hdrCell("Reato", BLU, 2200), hdrCell("Gestione nel sistema", BLU, 5400)] }),
                    ...([
                        ["Art. 589-bis C.P.", "Omicidio stradale", "Attiva workflow penale completo, S.I.T. obbligatorie, flag mortale"],
                        ["Art. 590-bis C.P.", "Lesioni personali stradali gravi", "Verifica injuries = GRAVE|GRAVISSIMA, attiva S.I.T."],
                        ["Art. 186 C.d.S.", "Guida in stato di ebbrezza", "Campi alcoholTestDone + alcoholTestResult obbligatori"],
                        ["Art. 187 C.d.S.", "Guida sotto stupefacenti", "Campi drugTestDone + drugTestResult obbligatori"],
                        ["Art. 189 C.d.S.", "Fuga e omissione di soccorso", "Flag specifico + annotazione verbale"],
                        ["Art. 116 C.d.S.", "Guida senza patente", "Campo licenseValid = false + alert"],
                        ["Art. 193 C.d.S.", "Mancanza assicurazione", "Campo insuranceValid = false + alert + norma suggerita"],
                    ].map(([a, r, g], i) => new TableRow({
                        children: [
                            cell([p([b(a, "8B0000", 18)])], { fill: i % 2 === 0 ? WHT : GRY, width: 1400 }),
                            cell([p([b(r, "333333", 18)])], { fill: i % 2 === 0 ? WHT : GRY, width: 2200 }),
                            cell([p([t(g, "333333", 18)])], { fill: i % 2 === 0 ? WHT : GRY, width: 5400 }),
                        ]
                    })))
                ]
            }),

            ...spacer(1),
            p([t("Il campo penalArticles (String[]) permette di annotare tutti gli articoli contestati, selezionabili tramite checkbox-list degli articoli piu' frequenti piu' campo testo libero.")]),

            ...spacer(2),
            new Paragraph({ children: [new PageBreak()] }),

            // ══════════════════ 7. ESCUSSIONE ══════════════════════════════════════════════
            heading1("7. ESCUSSIONE CONDUCENTI, PASSEGGERI E TESTIMONI"),

            heading2("7.1 Flusso raccolta dichiarazioni"),
            heading3("Per conducenti (procedimento amministrativo L.689/81):"),
            bullet("Step 1: Informativa diritti ex art. 14 L.689/81 (checkbox, timestamp automatico)"),
            bullet("Step 2: Il conducente sceglie: rende dichiarazione / si avvale della facolta' di non rispondere"),
            bullet("Step 3: Campo testo per dichiarazione spontanea o su invito"),
            bullet("Step 4: Firma (canvas touch su tablet oppure spunta firmato/non firmato/non vuole firmare)"),

            ...spacer(1),
            heading3("Per testimoni (procedimento penale — S.I.T. art. 351 C.p.p.):"),
            bullet("Step 1: Identificazione completa del testimone"),
            bullet("Step 2: Ammonizione ex art. 64 C.p.p. (checkbox obbligatoria + timestamp), campo legalWarningGiven"),
            bullet("Step 3: Raccolta sommarie informazioni testimoniali (testo libero, strutturato come domanda/risposta)"),
            bullet("Step 4: Firma testimone + firma agente"),
            noteBox("CRITICO: Il sistema deve differenziare chiaramente il tipo di atto (dichiarazione spontanea L.689 vs S.I.T. penale) perche' hanno valore probatorio e requisiti formali diversi. Il type = S.I.T. forza legalWarningGiven = true prima del salvataggio.", RED_L, RED),

            ...spacer(1),
            heading2("7.2 Struttura AccidentDeclaration — dettaglio tipo"),
            new Table({
                width: { size: 9000, type: WidthType.DXA }, columnWidths: [2200, 6800],
                rows: [
                    new TableRow({ tableHeader: true, children: [hdrCell("type (Enum)", BLU, 2200), hdrCell("Quando usare + requisiti", BLU, 6800)] }),
                    ...([
                        ["SPONTANEA", "Il soggetto decide liberamente di dichiarare — nessun obbligo formale aggiuntivo"],
                        ["SU_INVITO", "L'agente invita a dichiarare ex L.689/81 — obbligatoria notifica diritti"],
                        ["S.I.T.", "Sommarie Informazioni Testimoniali ex art.351 C.p.p. — obbligatoria ammonizione art.64 C.p.p. + legalWarningGiven=true"],
                        ["RIFIUTO", "Il soggetto si rifiuta di dichiarare — annotare ora rifiuto + firma agente"],
                    ].map(([t2, d], i) => new TableRow({
                        children: [
                            cell([p([b(t2, "1A3A6B", 18)])], { fill: i % 2 === 0 ? WHT : GRY, width: 2200 }),
                            cell([p([t(d, "333333", 18)])], { fill: i % 2 === 0 ? WHT : GRY, width: 6800 }),
                        ]
                    })))
                ]
            }),

            ...spacer(2),
            new Paragraph({ children: [new PageBreak()] }),

            // ══════════════════ 8. RILIEVI ════════════════════════════════════════════════
            heading1("8. RILIEVI SUL POSTO: FOTOGRAFIE, MISURE E PLANIMETRIA"),

            heading2("8.1 Gestione fotografie"),
            bullet("Upload diretto da mobile con compressione automatica (max 2MB per preview, originale in S3)"),
            bullet("Categoria obbligatoria: PANORAMICA | VEICOLO | DANNI | SEGNALETICA | TRACCE | PLANIMETRIA | ALTRO"),
            bullet("Lettura automatica metadati EXIF (GPS, timestamp): pre-compilano takenAt, gpsLat, gpsLng"),
            bullet("Didascalia libera e numero d'ordine (drag & drop per riordinare nella UI desktop)"),
            bullet("Flag includeInReport: solo le foto flaggate appaiono nel PDF finale"),
            bullet("Le URL S3 sono pre-signed con scadenza 1 ora — mai URL pubblici permanenti per atti giudiziari"),

            ...spacer(1),
            heading2("8.2 Misure metriche — struttura dati"),
            p([t("Il campo impactMeasures su AccidentSurvey e' un array JSON strutturato:")]),
            new Table({
                width: { size: 9000, type: WidthType.DXA }, columnWidths: [1800, 1800, 1200, 2000, 2200],
                rows: [
                    new TableRow({
                        tableHeader: true, children: [
                            hdrCell("label", BLU, 1800), hdrCell("value", BLU, 1800), hdrCell("unit", BLU, 1200),
                            hdrCell("fromReference", BLU, 2000), hdrCell("Esempio", BLU, 2200)
                        ]
                    }),
                    ...([
                        ["Distanza impatto", "12.40", "m", "Incrocio via Roma", "Dalla stop al punto urto"],
                        ["Traccia frenata A", "8.20", "m", "Punto urto", "Traccia sx Veicolo A"],
                        ["Larghezza carreggiata", "7.00", "m", "Marciapiede sx", "Sezione strada"],
                        ["Distanza detriti", "3.50", "m", "Punto urto", "Frammenti plastici"],
                    ].map(([l, v, u, r, e], i) => new TableRow({
                        children: [
                            cell([p([t(l, "1A3A6B", 18)])], { fill: i % 2 === 0 ? WHT : GRY, width: 1800 }),
                            cell([p([t(v, "1A6B3A", 18)])], { fill: i % 2 === 0 ? WHT : GRY, width: 1800 }),
                            cell([p([t(u, "555555", 18)])], { fill: i % 2 === 0 ? WHT : GRY, width: 1200 }),
                            cell([p([t(r, "333333", 18)])], { fill: i % 2 === 0 ? WHT : GRY, width: 2000 }),
                            cell([p([it(e, "666666", 17)])], { fill: i % 2 === 0 ? WHT : GRY, width: 2200 }),
                        ]
                    })))
                ]
            }),

            ...spacer(1),
            p([t("L'UI presenta questa tabella come un form dinamico con 'Aggiungi misura' — non un campo testo libero. Garantisce dati strutturati e stampabili correttamente nel PDF.")]),

            ...spacer(1),
            heading2("8.3 Planimetria dinamica"),
            bullet("Opzione A (base): Upload foto di schizzo manuale (categoria PLANIMETRIA)"),
            bullet("Opzione B (avanzata, fase 2+): Editor SVG semplificato — l'agente posiziona blocchi Veicolo A/B, frecce di direzione, marcatori punto urto, tracce frenata. SVG salvato come dynamicDiagramUrl"),
            bullet("L'editor SVG puo' essere realizzato con Fabric.js o Konva.js"),

            ...spacer(2),
            new Paragraph({ children: [new PageBreak()] }),

            // ══════════════════ 9. DANNI E SEGNALETICA ════════════════════════════════════
            heading1("9. RILEVAMENTO DANNI, SEGNALETICA E PARTICOLARI"),

            heading2("9.1 Danni ai veicoli"),
            bullet("Zone disponibili: anteriore_dx | anteriore_sx | anteriore_centrale | posteriore_dx | posteriore_sx | posteriore_centrale | fianco_dx | fianco_sx | tetto | pavimento | parabrezza | lunotto | airbag_frontale | airbag_laterale | scocca"),
            bullet("UI: diagramma veicolo interattivo con tap per selezionare le zone danneggiate"),
            bullet("Campo damageDescription per descrizione narrativa aggiuntiva"),
            bullet("Possibilita' di allegare foto specifiche al veicolo"),

            ...spacer(1),
            heading2("9.2 Danni a segnaletica e infrastrutture"),
            bullet("signagePresent []: elenco segnaletica verticale presente (lista standard + aggiunta manuale)"),
            bullet("signageDamaged: segnaletica danneggiata o mancante rispetto all'obbligatorieta' del tratto"),
            bullet("roadMarkingsPresent: presenza segnaletica orizzontale (strisce, zebre, frecce)"),
            bullet("trafficLightPresent + trafficLightWorking: gestione semafori (rilevante per attribuzione responsabilita')"),
            bullet("guardRailDamaged: guard-rail, new jersey, barriere danneggiate"),
            bullet("publicLightingDamaged: pali illuminazione pubblica coinvolti"),
            bullet("otherDamages: danni a terze proprieta' (recinzioni, negozi, veicoli in sosta)"),
            noteBox("I danni a infrastrutture pubbliche generano automaticamente un'annotazione nel verbale che suggerisce la trasmissione di copia degli atti all'ente proprietario della strada (ANAS, Provincia, Comune).", BLU_L, BLU),

            ...spacer(2),
            new Paragraph({ children: [new PageBreak()] }),

            // ══════════════════ 10. RIMOZIONE ═════════════════════════════════════════════
            heading1("10. GESTIONE RIMOZIONE VEICOLI"),

            bullet("towingRequired (Boolean): flag attivabile dall'agente sul posto"),
            bullet("towingCompany (String): ditta carro attrezzi intervenuta"),
            bullet("towingAt (DateTime): ora di rimozione effettiva"),
            bullet("depositLocation (String): luogo di deposito del veicolo (es. Depositeria Comunale Via X)"),

            ...spacer(1),
            heading2("10.1 Workflow rimozione"),
            p([t("Quando towingRequired = true il sistema:")]),
            bullet("Aggiunge automaticamente una sezione 'Rimozione Veicoli' nel PDF del verbale"),
            bullet("Permette di stampare separatamente il 'Verbale di Rimozione' (modello specifico)"),
            bullet("Invia notifica email al conducente/proprietario con dati depositeria"),
            bullet("Registra il veicolo come 'da recuperare' nella dashboard"),

            ...spacer(1),
            heading2("10.2 Normativa rimozione"),
            bullet("Art. 159 C.d.S.: rimozione forzata per impedimento alla circolazione"),
            bullet("Art. 213 C.d.S.: sequestro e confisca del veicolo (in caso di reati connessi)"),
            bullet("Regolamento comunale di polizia locale (campo configurabile per tenant)"),

            ...spacer(2),
            new Paragraph({ children: [new PageBreak()] }),

            // ══════════════════ 11. SCAMBIO DATI ══════════════════════════════════════════
            heading1("11. SCAMBIO DATI TRA LE PARTI (EMAIL / PEC)"),

            heading2("11.1 Destinatari e tipi di comunicazione"),
            new Table({
                width: { size: 9000, type: WidthType.DXA }, columnWidths: [2500, 2000, 4500],
                rows: [
                    new TableRow({ tableHeader: true, children: [hdrCell("Destinatario", BLU, 2500), hdrCell("Tipo invio", BLU, 2000), hdrCell("Contenuto", BLU, 4500)] }),
                    ...([
                        ["Conducenti coinvolti", "Email ordinaria", "Estratto dati incidente, numero protocollo, indicazioni per ritiro copia atti"],
                        ["Compagnie assicurative", "Email/PEC", "Notifica sinistro con dati essenziali (formato standard ANIA)"],
                        ["Proprietario veicolo rimosso", "Email ordinaria", "Dati depositeria, costi, procedura ritiro"],
                        ["Ospedale/118", "Email interna", "Conferma trasporto e dati infortunato"],
                        ["VV.F. / altri enti", "PEC istituzionale", "Copia atti per competenza"],
                        ["Prefettura/ISTAT", "Export strutturato", "File CSV/XML con dati statistici incidente"],
                    ].map(([d, t2, c], i) => new TableRow({
                        children: [
                            cell([p([b(d, "1A3A6B", 18)])], { fill: i % 2 === 0 ? WHT : GRY, width: 2500 }),
                            cell([p([t(t2, "555555", 18)])], { fill: i % 2 === 0 ? WHT : GRY, width: 2000 }),
                            cell([p([t(c, "333333", 18)])], { fill: i % 2 === 0 ? WHT : GRY, width: 4500 }),
                        ]
                    })))
                ]
            }),

            ...spacer(1),
            heading2("11.2 Implementazione tecnica"),
            bullet("Ogni invio email e' registrato in AccidentEmailLog {id, accidentId, sentAt, recipient, subject, type, status}"),
            bullet("Nodemailer con SMTP configurabile per tenant (supporto PEC tramite relay certificato)"),
            bullet("Template email personalizzabili per tenant con variabili dinamiche ({{protocolNumber}}, {{date}}, ecc.)"),
            bullet("Allegati: PDF del fascicolo firmato (link S3 o allegato diretto — configurabile)"),
            bullet("Stato invio tracciato: PENDING | SENT | DELIVERED | FAILED con possibilita' di reinvio"),

            ...spacer(2),
            new Paragraph({ children: [new PageBreak()] }),

            // ══════════════════ 12. MOTORIZZAZIONE ════════════════════════════════════════
            heading1("12. INTEGRAZIONE MOTORIZZAZIONE CIVILE (MIT/DTT)"),

            heading2("12.1 Servizi disponibili"),
            bullet("Interrogazione veicolo per targa: dati tecnici, proprietario, assicurazione RCA (sistema SIV), revisione"),
            bullet("Verifica patente: categoria, scadenza, punti residui, sospensioni in corso"),
            bullet("Interrogazione SITA: archivio assicurativo nazionale (polizza attiva/scaduta)"),

            ...spacer(1),
            heading2("12.2 Flusso integrazione"),
            bullet("Frontend invia richiesta a: POST /api/accidents/:id/vehicles/:vehicleId/fetch-mit"),
            bullet("Backend autentica verso DTT con certificato client (configurato per tenant)"),
            bullet("Risposta MIT popola automaticamente: brand, model, color, registrationYear, ownerName, ownerFiscalCode, ownerAddress, insuranceCompany, insurancePolicy, insuranceExpiry, insuranceValid, revisionExpiry"),
            bullet("Timestamp mitDataFetchedAt registra l'ora dell'interrogazione"),
            bullet("Se il servizio MIT non e' disponibile: i campi rimangono editabili manualmente con flag 'dato inserito manualmente'"),
            noteBox("PREREQUISITO: L'accesso ai WS DTT richiede convenzione con MIT e certificato digitale rilasciato per l'ente. Il sistema deve supportare certificati diversi per ogni tenant. Prevedere un modulo di configurazione 'Integrazioni esterne' nel backoffice.", ORG_L, ORG),

            ...spacer(1),
            heading2("12.3 Caching e rate limiting"),
            bullet("Risultati MIT cachati per targa per 24h (tabella MitCache) per evitare interrogazioni duplicate"),
            bullet("Rate limiting: max 100 interrogazioni/ora per tenant (configurabile)"),
            bullet("Log di tutte le interrogazioni per audit e rendicontazione verso MIT"),

            ...spacer(2),
            new Paragraph({ children: [new PageBreak()] }),

            // ══════════════════ 13. ENTI ESTERNI ══════════════════════════════════════════
            heading1("13. INTERVENUTI ESTERNI: VV.F., 118, ALTRI ENTI"),

            new Table({
                width: { size: 9000, type: WidthType.DXA }, columnWidths: [1800, 1500, 5700],
                rows: [
                    new TableRow({ tableHeader: true, children: [hdrCell("unitType", BLU, 1800), hdrCell("Label UI", BLU, 1500), hdrCell("Campi aggiuntivi da compilare", BLU, 5700)] }),
                    ...([
                        ["VVF", "Vigili del Fuoco", "Numero squadra, ora arrivo/partenza, operazioni svolte (estrazione, incendio, bonifica)"],
                        ["118", "Servizio 118 / SUEM", "Codice mezzo, ora arrivo, numero feriti trasportati, ospedali destinazione"],
                        ["POLIZIA_STATO", "Polizia di Stato", "Motivo intervento congiunto, numero radiomobile, ufficiale referente"],
                        ["CARABINIERI", "Carabinieri", "Motivo intervento congiunto, stazione, numero pattuglia"],
                        ["GDF", "Guardia di Finanza", "Motivo intervento"],
                        ["ANAS", "ANAS / Autostrade", "Cantiere, deviazione viabilita', ora riapertura"],
                        ["COMUNE", "Ufficio Tecnico Comune", "Intervento su viabilita'/segnaletica danneggiata"],
                        ["ALTRO", "Altro Ente", "Nome ente libero, descrizione"],
                    ].map(([u, l, c], i) => new TableRow({
                        children: [
                            cell([p([b(u, "1A3A6B", 18)])], { fill: i % 2 === 0 ? WHT : GRY, width: 1800 }),
                            cell([p([t(l, "555555", 18)])], { fill: i % 2 === 0 ? WHT : GRY, width: 1500 }),
                            cell([p([t(c, "333333", 18)])], { fill: i % 2 === 0 ? WHT : GRY, width: 5700 }),
                        ]
                    })))
                ]
            }),

            ...spacer(1),
            noteBox("Nel PDF finale, gli enti intervenuti sono elencati in una sezione dedicata con ora arrivo, ora partenza e attivita' svolta. Questo e' rilevante sia per la ricostruzione della dinamica sia per l'eventuale ripartizione delle responsabilita'.", BLU_L, BLU),

            ...spacer(2),
            new Paragraph({ children: [new PageBreak()] }),

            // ══════════════════ 14. DINAMICA ══════════════════════════════════════════════
            heading1("14. SVILUPPO DINAMICA DEL SINISTRO"),

            heading2("14.1 Struttura del campo dynamicDescription"),
            new Table({
                width: { size: 9000, type: WidthType.DXA }, columnWidths: [2500, 6500],
                rows: [
                    new TableRow({ tableHeader: true, children: [hdrCell("Sezione", BLU, 2500), hdrCell("Contenuto atteso", BLU, 6500)] }),
                    ...([
                        ["Premessa", "Ora, luogo, condizioni atmosferiche e stradali al momento del sopralluogo"],
                        ["Descrizione veicoli", "Posizione finale di ogni veicolo, direzione di marcia, stato"],
                        ["Ricostruzione dinamica", "Sequenza degli eventi: traiettorie, manovre, punto e modalita' d'urto"],
                        ["Elementi oggettivi rilevati", "Tracce di frenata, detriti, danni a infrastrutture — con riferimento alle misure"],
                        ["Dichiarazioni rese", "Sintesi delle dichiarazioni (rimanda agli atti allegati)"],
                        ["Conclusioni operative", "Azioni intraprese: sanzioni, sequestri, fermi, rimozioni, trasmissioni ad altri enti"],
                    ].map(([s, c], i) => new TableRow({
                        children: [
                            cell([p([b(s, "1A3A6B", 18)])], { fill: i % 2 === 0 ? WHT : GRY, width: 2500 }),
                            cell([p([t(c, "333333", 18)])], { fill: i % 2 === 0 ? WHT : GRY, width: 6500 }),
                        ]
                    })))
                ]
            }),

            ...spacer(1),
            heading2("14.2 Assistenza AI alla redazione (feature avanzata — fase 2+)"),
            p([t("Considerare l'integrazione di un assistente AI (es. Claude API) che, sulla base dei dati strutturati inseriti (veicoli, persone, misure, condizioni), genera una bozza automatica della sezione 'Ricostruzione dinamica'. L'agente la rivede e approva.")]),
            noteBox("La bozza AI e' sempre modificabile e non sostituisce la responsabilita' professionale dell'agente redattore. Il sistema deve indicare chiaramente nel documento che il testo e' stato 'assistito da sistema automatico e validato dall'agente [nome]'.", ORG_L, ORG),

            ...spacer(2),
            new Paragraph({ children: [new PageBreak()] }),

            // ══════════════════ 15. FIRMATARI ══════════════════════════════════════════════
            heading1("15. STESURA VERBALE: OPERATORE SINGOLO O COPPIA"),

            heading2("15.1 Scelta numero firmatari"),
            new Table({
                width: { size: 9000, type: WidthType.DXA }, columnWidths: [2200, 6800],
                rows: [
                    new TableRow({ tableHeader: true, children: [hdrCell("Configurazione", BLU, 2200), hdrCell("Dettaglio", BLU, 6800)] }),
                    new TableRow({
                        children: [
                            cell([p([b("Firma singola", "1A6B3A", 18)])], { fill: GRN_L, width: 2200 }),
                            cell([p([t("reportingOfficerId compilato, secondOfficerId = null. Nel PDF: 'Il Sottoscritto [nome cognome], [qualifica], matricola [n.]...'", "333333", 18)])], { fill: GRN_L, width: 6800 })
                        ]
                    }),
                    new TableRow({
                        children: [
                            cell([p([b("Firma doppia", "1A3A6B", 18)])], { fill: BLU_L, width: 2200 }),
                            cell([p([t("reportingOfficerId (capo pattuglio) + secondOfficerId. Nel PDF: sezione doppia con entrambi i dati. Qualifica/matricola precompilati dall'anagrafica agenti.", "333333", 18)])], { fill: BLU_L, width: 6800 })
                        ]
                    }),
                ]
            }),

            ...spacer(1),
            heading2("15.2 Dati agente da anagrafica"),
            bullet("Nome e cognome completo"),
            bullet("Qualifica/Grado (Agente, Assistente, Istruttore, Ispettore, Ufficiale...)"),
            bullet("Numero di matricola"),
            bullet("Comando di appartenenza"),
            bullet("Numero del turno in corso (da modulo Turni — killer feature!)"),

            ...spacer(1),
            heading2("15.3 Testo finale verbale — struttura"),
            bullet("Firma singola: 'Il presente verbale e' redatto e sottoscritto da [Agente 1], [Qualifica], mat. [N], in servizio presso il Comando di Polizia Locale di [Comune].'"),
            bullet("Firma doppia: 'Il presente verbale e' redatto dai sottoscritti: [Agente 1], [Qualifica], mat. [N] — [Agente 2], [Qualifica], mat. [N], in servizio presso...'"),
            bullet("Spazio firma autografa per stampa fisica (box firma in fondo alla pagina)"),

            ...spacer(2),
            new Paragraph({ children: [new PageBreak()] }),

            // ══════════════════ 16. API ════════════════════════════════════════════════════
            heading1("16. API LAYER — ENDPOINT CRUD"),

            new Table({
                width: { size: 9000, type: WidthType.DXA }, columnWidths: [900, 3600, 3200, 1300],
                rows: [
                    apiHdr(),
                    ...([
                        ["POST", "/api/v1/accidents", "Crea nuovo sinistro (stato BOZZA)", "AGENTE"],
                        ["GET", "/api/v1/accidents", "Lista sinistri del tenant (filtri, paginazione)", "AGENTE+"],
                        ["GET", "/api/v1/accidents/:id", "Dettaglio sinistro completo", "AGENTE+"],
                        ["PATCH", "/api/v1/accidents/:id", "Aggiorna campi fascicolo principale", "AGENTE+"],
                        ["PATCH", "/api/v1/accidents/:id/status", "Cambia stato (BOZZA → CHIUSO)", "UFFICIALE"],
                        ["DELETE", "/api/v1/accidents/:id", "Annulla sinistro (solo BOZZA, soft delete)", "ADMIN"],
                        ["POST", "/api/v1/accidents/:id/vehicles", "Aggiunge veicolo al sinistro", "AGENTE"],
                        ["PATCH", "/api/v1/accidents/:id/vehicles/:vid", "Aggiorna dati veicolo", "AGENTE"],
                        ["POST", "/api/v1/accidents/:id/vehicles/:vid/fetch-mit", "Interroga MIT per dati veicolo/targa", "AGENTE"],
                        ["POST", "/api/v1/accidents/:id/persons", "Aggiunge persona coinvolta", "AGENTE"],
                        ["PATCH", "/api/v1/accidents/:id/persons/:pid", "Aggiorna dati persona", "AGENTE"],
                        ["POST", "/api/v1/accidents/:id/declarations", "Registra dichiarazione/S.I.T.", "AGENTE"],
                        ["GET", "/api/v1/accidents/:id/declarations", "Lista dichiarazioni", "AGENTE+"],
                        ["POST", "/api/v1/accidents/:id/survey", "Crea rilievi tecnici", "AGENTE"],
                        ["PATCH", "/api/v1/accidents/:id/survey/:sid", "Aggiorna rilievi", "AGENTE"],
                        ["POST", "/api/v1/accidents/:id/photos", "Upload foto (multipart/form-data)", "AGENTE"],
                        ["DELETE", "/api/v1/accidents/:id/photos/:phid", "Elimina foto", "AGENTE"],
                        ["PATCH", "/api/v1/accidents/:id/photos/reorder", "Riordina sequenza foto", "AGENTE"],
                        ["POST", "/api/v1/accidents/:id/external-units", "Aggiunge ente esterno intervenuto", "AGENTE"],
                        ["POST", "/api/v1/accidents/:id/send-email", "Invia email/PEC alle parti", "AGENTE+"],
                        ["GET", "/api/v1/accidents/:id/pdf", "Genera e restituisce PDF del verbale", "AGENTE+"],
                        ["GET", "/api/v1/accidents/export/istat", "Export CSV/Excel per ISTAT (filtri data)", "ADMIN"],
                        ["GET", "/api/v1/accidents/stats/dashboard", "Statistiche aggregate per dashboard", "UFFICIALE"],
                    ].map(([m, e, d, a], i) => apiRow(m, e, d, a, i % 2 === 0 ? WHT : GRY)))
                ]
            }),

            ...spacer(2),
            new Paragraph({ children: [new PageBreak()] }),

            // ══════════════════ 17. PDF ════════════════════════════════════════════════════
            heading1("17. GENERAZIONE PDF — STRUTTURA E TEMPLATE"),

            heading2("17.1 Struttura del PDF finale"),
            ...([
                ["1. Intestazione", "Logo Comune + Comando Polizia Locale + RAPPORTO DI INCIDENTE STRADALE + numero protocollo"],
                ["2. Dati generali", "Data, ora, luogo (con coordinate GPS), condizioni meteo/stradali, gravita'"],
                ["3. Agenti intervenuti", "Nomi, qualifiche, matricole (1 o 2 agenti secondo configurazione), numero turno"],
                ["4. Veicoli coinvolti", "Tabella per ogni veicolo: targa, marca/modello, proprietario, conducente, assicurazione"],
                ["5. Persone coinvolte", "Tabella con ruolo, dati anagrafici, documento, lesioni, trasporto"],
                ["6. Enti intervenuti", "Lista VVF/118/altri con ora arrivo/partenza e attivita'"],
                ["7. Rilievi tecnici", "Geometria stradale, misure metriche tabellate, segnaletica, danni infrastrutture"],
                ["8. Fotografie", "Griglia foto (max 2 per riga) con didascalia — solo flaggate includeInReport"],
                ["9. Planimetria", "Immagine planimetria/schizzo in pagina dedicata"],
                ["10. Dinamica", "Testo narrativo completo con le sezioni strutturate"],
                ["11. Dichiarazioni", "Riassunto dichiarazioni con rimando agli allegati"],
                ["12. Note normative", "Articoli CdS/CP contestati, riferimenti L.689/81"],
                ["13. Firme", "Box firme agenti (1 o 2), spazio data/luogo, timbro ente"],
            ].map(([n, d]) => new Paragraph({
                spacing: { before: 50, after: 50 },
                numbering: { reference: "bul", level: 0 },
                children: [b(n + ": ", "1A3A6B", 19), t(d, "333333", 19)]
            }))),

            ...spacer(1),
            heading2("17.2 Tecnologia generazione PDF"),
            bullet("Raccomandato: Puppeteer (headless Chrome) — genera PDF da template HTML/CSS, massima flessibilita' grafica"),
            bullet("Alternativa: pdf-lib per documenti con struttura fissa (piu' leggero, nessuna dipendenza Chromium)"),
            bullet("Template HTML separato per tenant (possibilita' di personalizzare intestazione, colori, logo)"),
            bullet("Il PDF generato e' salvato in S3 come AccidentDocument e il link viene restituito all'API"),
            bullet("Firma digitale PDF (opzionale fase 2+): integrazione con provider firma digitale"),

            ...spacer(2),
            new Paragraph({ children: [new PageBreak()] }),

            // ══════════════════ 18. UI/UX ══════════════════════════════════════════════════
            heading1("18. UI/UX: WIZARD MOBILE E DASHBOARD DESKTOP"),

            heading2("18.1 App Mobile (Agente su strada) — Wizard a step"),
            new Table({
                width: { size: 9000, type: WidthType.DXA }, columnWidths: [600, 2400, 5000, 1000],
                rows: [
                    new TableRow({ tableHeader: true, children: [hdrCell("Step", BLU, 600), hdrCell("Titolo", BLU, 2400), hdrCell("Campi / Azioni", BLU, 5000), hdrCell("Obbl.", BLU, 1000)] }),
                    ...([
                        ["1", "Dove siamo?", "GPS automatico + mappa, indirizzo, data/ora, note posizione", "Si"],
                        ["2", "Cosa e' successo?", "Gravita', N. veicoli, condizioni meteo/strada/luce", "Si"],
                        ["3", "Enti intervenuti?", "Bottoni rapidi VVF/118/altri, ore arrivo/partenza", ""],
                        ["4", "Veicolo A", "Targa → MIT auto-fill, tipo veicolo, danni rapidi, rimozione", "Si"],
                        ["5", "Veicolo B (e oltre)", "Stesso step replicato per ogni veicolo", ""],
                        ["6", "Persone", "Per ogni veicolo: conducente, passeggeri, pedoni, testimoni", "Si"],
                        ["7", "Dichiarazioni", "Wizard dichiarazione per ogni soggetto (tipo, testo, firma)", ""],
                        ["8", "Foto", "Camera + gallery, categoria, didascalia", ""],
                        ["9", "Rilievi rapidi", "Misure essenziali, segnaletica, tracce frenata", ""],
                        ["10", "Riepilogo", "Anteprima dati, conferma invio all'ufficio", "Si"],
                    ].map(([s, t2, c, o], i) => new TableRow({
                        children: [
                            cell([p([b(s, WHT, 18)])], { fill: BLU_M, width: 600 }),
                            cell([p([b(t2, "1A3A6B", 18)])], { fill: i % 2 === 0 ? WHT : GRY, width: 2400 }),
                            cell([p([t(c, "333333", 18)])], { fill: i % 2 === 0 ? WHT : GRY, width: 5000 }),
                            cell([p([b(o, GRN, 18)])], { fill: i % 2 === 0 ? WHT : GRY, width: 1000 }),
                        ]
                    })))
                ]
            }),

            ...spacer(1),
            heading2("18.2 Dashboard Desktop (Ufficio Infortunistica)"),
            bullet("Tabella sinistri con filtri: data, stato, gravita', agente, presenza feriti, export PDF/Excel"),
            bullet("Vista Mappa: pin colorati per gravita' (verde=danni, arancione=feriti, rosso=mortale)"),
            bullet("Fascicolo sinistro completo: tab organizzati (Anagrafica | Veicoli | Persone | Rilievi | Foto | Dichiarazioni | Verbale)"),
            bullet("Editor dinamica: editor WYSIWYG con template precompilato e assistenza AI"),
            bullet("Pannello firmatari: selezione 1 o 2 agenti da anagrafica con anteprima testo finale"),
            bullet("Generazione PDF: pulsante 'Genera Bozza PDF' (preview) e 'Genera PDF Definitivo' (blocca modifiche)"),

            ...spacer(2),
            new Paragraph({ children: [new PageBreak()] }),

            // ══════════════════ 19. SICUREZZA ═════════════════════════════════════════════
            heading1("19. SICUREZZA, GDPR E AUDIT LOG"),

            heading2("19.1 Protezione dati personali (D.Lgs. 196/2003 + GDPR)"),
            bullet("Dati sensibili (CF, telefono, email persone coinvolte) cifrati a riposo con AES-256"),
            bullet("Accesso ai dati personali limitato agli agenti del tenant (row-level security via tenantId)"),
            bullet("Log accessi ai fascicoli contenenti dati di minori o dati sanitari"),
            bullet("Conservazione dati: configurabile per tenant (default 10 anni per atti di P.L.) con anonimizzazione automatica"),
            bullet("Esportazione dati: solo ruoli ADMIN/UFFICIALE possono esportare dati grezzi"),

            ...spacer(1),
            heading2("19.2 Audit Log"),
            p([t("Ogni operazione su un AccidentReport genera un record in AccidentAuditLog:")]),
            bullet("Campi: {id, accidentId, userId, action, changedFields, oldValues, newValues, timestamp, ipAddress}"),
            bullet("Azioni tracciate: CREATED, UPDATED, STATUS_CHANGED, PDF_GENERATED, EMAIL_SENT, MIT_QUERIED, PHOTO_UPLOADED, DECLARATION_ADDED"),
            bullet("Il log e' read-only (nessun endpoint di modifica/eliminazione)"),
            bullet("Visualizzabile dall'Ufficiale nella tab 'Cronologia' del fascicolo"),

            ...spacer(2),
            new Paragraph({ children: [new PageBreak()] }),

            // ══════════════════ 20. ROADMAP ════════════════════════════════════════════════
            heading1("20. FASI DI SVILUPPO E ROADMAP"),

            new Table({
                width: { size: 9000, type: WidthType.DXA }, columnWidths: [800, 2000, 4500, 1700],
                rows: [
                    new TableRow({ tableHeader: true, children: [hdrCell("Fase", BLU, 800), hdrCell("Sprint (est.)", BLU, 2000), hdrCell("Deliverable", BLU, 4500), hdrCell("Priorita'", BLU, 1700)] }),
                    ...([
                        ["1", "Sprint 1-2 (2 sett.)", "Schema Prisma completo + migrazioni DB + seed dati di test", "Critica"],
                        ["2", "Sprint 3-4 (2 sett.)", "API Layer CRUD completo con autenticazione e validazione Zod", "Critica"],
                        ["3", "Sprint 5-7 (3 sett.)", "UI Mobile Wizard (step 1-10) con upload foto e MIT integration", "Critica"],
                        ["4", "Sprint 8-9 (2 sett.)", "Dashboard Desktop: lista, filtri, fascicolo completo, editor dinamica", "Critica"],
                        ["5", "Sprint 10-11 (2 sett.)", "Generazione PDF Puppeteer (template base firma singola/doppia)", "Critica"],
                        ["6", "Sprint 12 (1 sett.)", "Email/PEC invio dati alle parti + log comunicazioni", "Alta"],
                        ["7", "Sprint 13 (1 sett.)", "Export ISTAT/Prefettura (CSV/Excel) + dashboard statistiche", "Alta"],
                        ["8", "Sprint 14 (1 sett.)", "Audit Log + UI cronologia + hardening GDPR", "Alta"],
                        ["9", "Sprint 15-16 (2 sett.)", "Editor SVG planimetria interattiva", "Media"],
                        ["10", "Sprint 17+ (futuro)", "Assistenza AI redazione dinamica (Claude API)", "Bassa"],
                    ].map(([f, s, d, pri], i) => new TableRow({
                        children: [
                            cell([p([b(f, WHT, 18)])], { fill: BLU_M, width: 800 }),
                            cell([p([t(s, "555555", 18)])], { fill: i % 2 === 0 ? WHT : GRY, width: 2000 }),
                            cell([p([t(d, "333333", 18)])], { fill: i % 2 === 0 ? WHT : GRY, width: 4500 }),
                            cell([p([t(pri, "333333", 18)])], { fill: i % 2 === 0 ? WHT : GRY, width: 1700 }),
                        ]
                    })))
                ]
            }),

            ...spacer(2),
            new Paragraph({ children: [new PageBreak()] }),

            // ══════════════════ 21. OPEN QUESTIONS ════════════════════════════════════════
            heading1("21. RISPOSTE ALLE OPEN QUESTIONS"),

            heading2("OQ1 — Gestione Foto e Planimetrie"),
            p([b("Raccomandazione: ", "1A3A6B", 20), t("Storage S3-compatibile obbligatorio. Proposta implementazione:")]),
            bullet("Self-hosted: MinIO (open source, zero costi licenza, deployabile sullo stesso VPS/cloud)"),
            bullet("Cloud managed: AWS S3, Cloudflare R2 (zero egress fees), o Wasabi (economico)"),
            bullet("Strategia URL: pre-signed URL con scadenza 1 ora — mai URL pubblici permanenti per atti giudiziari"),
            bullet("Backup: replicazione automatica bucket separato per i documenti chiusi (stato CLOSED)"),
            bullet("Limite upload: 10MB per foto originale, thumbnail 400px auto-generata server-side"),

            ...spacer(1),
            heading2("OQ2 — Creazione sinistro autonoma vs da Intervento"),
            p([b("Raccomandazione: ", "1A3A6B", 20), t("Entrambe le modalita', con peso sulla creazione autonoma.")]),
            bullet("La maggioranza dei sinistri viene rilevata dalla pattuglia in modo autonomo, non necessariamente da centrale"),
            bullet("Il campo interventionId deve essere opzionale — non un requisito bloccante per la creazione"),
            bullet("Se l'agente arriva dal modulo Interventi, il sinistro puo' essere pre-creato con i dati dell'intervento"),
            bullet("Se autonomo: creazione totale da zero con geolocalizzazione GPS immediata"),
            noteBox("SOLUZIONE TECNICA: due entry point — (A) da 'Lista Interventi': pulsante 'Apri Sinistro' che pre-compila dal record Intervention; (B) da 'Nuovi Sinistri': creazione autonoma. In entrambi i casi l'interventionId e' facoltativo nel payload API.", GRN_L, GRN),

            ...spacer(2),
            new Paragraph({ children: [new PageBreak()] }),

            // ══════════════════ 22. APPENDICE ═════════════════════════════════════════════
            heading1("22. APPENDICE — ENUM E COSTANTI DI RIFERIMENTO"),

            heading2("22.1 Enum completo severity"),
            new Table({
                width: { size: 9000, type: WidthType.DXA }, columnWidths: [2500, 3000, 3500],
                rows: [
                    new TableRow({ tableHeader: true, children: [hdrCell("Valore", BLU, 2500), hdrCell("Label UI", BLU, 3000), hdrCell("Implicazioni", BLU, 3500)] }),
                    ...([
                        ["SOLO_DANNI", "Solo danni a cose", "Procedura civile/amministrativa"],
                        ["FERITI", "Con feriti", "Attiva workflow art. 590-bis C.P. se grave"],
                        ["RISERVA_PROGNOSI", "Feriti con prognosi riservata", "Trattato come FERITI GRAVI fino a conferma"],
                        ["MORTALE", "Con decessi", "Attiva workflow art. 589-bis C.P., obbligatoria PG"],
                    ].map(([v, l, i2], i) => new TableRow({
                        children: [
                            cell([p([b(v, "1A3A6B", 18)])], { fill: i % 2 === 0 ? WHT : GRY, width: 2500 }),
                            cell([p([t(l, "333333", 18)])], { fill: i % 2 === 0 ? WHT : GRY, width: 3000 }),
                            cell([p([t(i2, "555555", 18)])], { fill: i % 2 === 0 ? WHT : GRY, width: 3500 }),
                        ]
                    })))
                ]
            }),

            ...spacer(1),
            heading2("22.2 Enum status — transizioni consentite"),
            new Table({
                width: { size: 9000, type: WidthType.DXA }, columnWidths: [2000, 3000, 4000],
                rows: [
                    new TableRow({ tableHeader: true, children: [hdrCell("Da → A", BLU, 2000), hdrCell("Chi puo' farlo", BLU, 3000), hdrCell("Condizioni", BLU, 4000)] }),
                    ...([
                        ["BOZZA → IN_COMPILAZIONE", "Agente", "Almeno 1 veicolo e 1 persona inseriti"],
                        ["IN_COMPILAZIONE → REVISIONATO", "Agente Infortunistica", "Dinamica compilata, survey presente"],
                        ["REVISIONATO → CHIUSO", "Ufficiale/Comandante", "Supervisore assegnato + PDF generato"],
                        ["CHIUSO → REVISIONATO", "Ufficiale", "Solo con motivazione scritta (audit log)"],
                        ["* → ANNULLATO", "Admin", "Solo in stati BOZZA/IN_COMPILAZIONE + motivazione"],
                    ].map(([t3, c, cond], i) => new TableRow({
                        children: [
                            cell([p([b(t3, "1A3A6B", 18)])], { fill: i % 2 === 0 ? WHT : GRY, width: 2000 }),
                            cell([p([t(c, "555555", 18)])], { fill: i % 2 === 0 ? WHT : GRY, width: 3000 }),
                            cell([p([t(cond, "333333", 18)])], { fill: i % 2 === 0 ? WHT : GRY, width: 4000 }),
                        ]
                    })))
                ]
            }),

            ...spacer(1),
            heading2("22.3 Checklist pre-sviluppo"),
            bullet("Schema Prisma completo (§4) approvato dal team"),
            bullet("Convenzione MIT/DTT attiva o simulata con mock server per sviluppo"),
            bullet("Provider storage S3 scelto e bucket configurato"),
            bullet("Provider SMTP/PEC scelto e credenziali disponibili"),
            bullet("Template PDF base approvato graficamente dal Comune pilota"),
            bullet("Ruoli e permessi allineati con il sistema di autenticazione esistente"),
            bullet("GDPR: DPA (Data Processing Agreement) con provider storage e email"),

            ...spacer(1),
            new Paragraph({
                spacing: { before: 200, after: 200 }, alignment: AlignmentType.CENTER,
                shading: { fill: BLU, type: ShadingType.CLEAR },
                children: [b("Fine documento — Analisi Tecnica Modulo Sinistri Stradali v1.0", WHT, 20)]
            }),

        ]
    }]
});

Packer.toBuffer(doc).then(buf => {
    fs.writeFileSync('/mnt/user-data/outputs/Analisi_Tecnica_Modulo_Sinistri_Stradali.docx', buf);
    console.log('OK');
}).catch(err => { console.error(err); process.exit(1); });
JSEOF
node / home / claude / sinistri_fix.js
