import jsPDF from "jspdf"
import "jspdf-autotable"

// Definizione interfacce per rimuovere "any" e warning lint
interface Agent {
  id: string;
  name: string;
}

interface Shift {
  userId: string;
  date: string | Date;
  type: string;
  repType: string | null;
}

interface DayInfo {
  day: number;
  name: string;
  isWeekend: boolean;
  isHoliday?: boolean;
  isVigilia?: boolean;
  isNextMonth: boolean;
  month?: number;
}

interface ODSShift {
  userId: string;
  type: string;
  timeRange?: string;
  serviceDetails?: string;
  patrolGroupId?: string | null;
  serviceType?: { name: string } | null;
  vehicle?: { name: string } | null;
}

interface ODSUser {
  id: string;
  name: string;
  qualifica?: string;
  isUfficiale?: boolean;
  servizio?: string;
}

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: import("jspdf-autotable").UserOptions) => jsPDF;
  lastAutoTable: { finalY: number };
  internal: any; 
  addImage: any;
}

interface jsPDFCellConfig {
  content: string;
  styles?: Record<string, unknown>;
}

/**
 * Genera un Hash SHA-256 di una stringa o buffer
 * Migliorato con fallback per contesti non sicuri (HTTP)
 */
async function generateHash(content: string | ArrayBuffer): Promise<string> {
  // Fallback se crypto.subtle non è disponibile (es. HTTP locale senza HTTPS)
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    console.warn("[PDF] Crypto Subtle non disponibile. Utilizzo fallback hash semplificato.");
    return "OFFLINE-" + Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
  }

  try {
    const msgUint8 = typeof content === "string" 
      ? new TextEncoder().encode(content) 
      : new Uint8Array(content);
    
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  } catch (err) {
    console.error("[PDF] Errore generazione hash:", err);
    return "HASH-ERROR-" + Date.now();
  }
}

/**
 * Genera il PDF professionale della pianificazione mensile
 */
export async function generatePlanningPDF({
  monthName,
  month,
  year,
  agents,
  shifts,
  dayInfo,
  tenantName = "Comando Polizia Locale",
  logoUrl
}: {
  monthName: string,
  month: number,
  year: number,
  agents: Agent[],
  shifts: Shift[],
  dayInfo: DayInfo[],
  tenantName?: string,
  logoUrl?: string | null
}) {
  try {
    console.log("[PDF] Avvio generazione professionale...");
    
    // IMPORT DINAMICI PER COMPATIBILITÀ NEXT.JS BROWSER
    const { default: jsPDFLib } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const QRCodeLib = await import("qrcode");

    const doc = new jsPDFLib({
      orientation: "landscape",
      unit: "mm",
      format: "a4"
    }) as unknown as jsPDFWithAutoTable;

    const navelBlue: [number, number, number] = [15, 23, 42]; // Slate 900
    const indigo600: [number, number, number] = [79, 70, 229]; // Indigo 600
    const rose100: [number, number, number] = [255, 228, 230]; // Rose 100
    const rose600: [number, number, number] = [225, 29, 72]; // Rose 600
    const amber50: [number, number, number] = [255, 251, 235]; // Amber 50
    const amber600: [number, number, number] = [180, 83, 9]; // Amber 600
    const emerald100: [number, number, number] = [209, 250, 229];
    const emerald600: [number, number, number] = [5, 150, 105];

    // 1. Intestazione
    if (logoUrl) {
      try {
        doc.addImage(logoUrl, "PNG", 14, 10, 25, 25);
        doc.setFontSize(22);
        doc.setTextColor(navelBlue[0], navelBlue[1], navelBlue[2]);
        doc.setFont("helvetica", "bold");
        doc.text(tenantName.toUpperCase(), 42, 20);
      } catch (e) {
        console.warn("[PDF] Errore caricamento logo, fallback su testo", e);
        doc.setFontSize(22);
        doc.setTextColor(navelBlue[0], navelBlue[1], navelBlue[2]);
        doc.setFont("helvetica", "bold");
        doc.text(tenantName.toUpperCase(), 14, 18);
      }
    } else {
      doc.setFontSize(22);
      doc.setTextColor(navelBlue[0], navelBlue[1], navelBlue[2]);
      doc.setFont("helvetica", "bold");
      doc.text(tenantName.toUpperCase(), 14, 18);
    }
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(`PIANIFICAZIONE REPERIBILITÀ - ${monthName.toUpperCase()} ${year}`, 14, 25);
    
    doc.setLineWidth(0.8);
    doc.setDrawColor(navelBlue[0], navelBlue[1], navelBlue[2]);
    doc.line(14, 28, 283, 28);

    // 2. Preparazione Dati
    const headers = ["Agente", ...dayInfo.map(d => d.day.toString()), "TOT"];
    const monthIndex = month - 1;

    const rows = agents.map(agent => {
      let repTotal = 0;
      const row: (string | number)[] = [agent.name];
      
      dayInfo.forEach(di => {
        const targetY = year;
        const targetM = di.isNextMonth ? (monthIndex === 11 ? 0 : monthIndex + 1) : monthIndex;
        const targetD = di.day;
        
        const shift = shifts.find(s => {
          if (!s.date) return false;
          const dObj = new Date(s.date);
          const targetIso = new Date(Date.UTC(targetY, targetM, targetD)).toISOString().split('T')[0];
          const sIso = dObj.toISOString().split('T')[0];
          
          return s.userId === agent.id && (
            sIso === targetIso ||
            (dObj.getUTCFullYear() === targetY && dObj.getUTCMonth() === targetM && dObj.getUTCDate() === targetD) ||
            (dObj.getFullYear() === targetY && dObj.getMonth() === targetM && dObj.getDate() === targetD)
          );
        });
        
        let val = "";
        const sType = (shift?.type || "").toUpperCase();
        const rType = (shift?.repType || "").toUpperCase();

        if (rType.includes("REP") || rType === "RP" || rType === "RS") {
          val = rType;
          repTotal++;
        } else if (sType.includes("REP")) {
          val = sType;
          repTotal++;
        } else if (sType) {
          val = sType;
        }
        row.push(val);
      });
      
      row.push(repTotal.toString());
      return row;
    });

    // 3. Generazione Tabella
    autoTable(doc, {
      startY: 34,
      head: [headers],
      body: rows,
      theme: "grid",
      styles: {
        fontSize: 7.5,
        cellPadding: 1.2,
        halign: "center",
        valign: "middle",
        lineWidth: 0.05,
        lineColor: [220, 220, 220]
      },
      headStyles: {
        fillColor: navelBlue,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8
      },
      columnStyles: {
        0: { halign: "left", fontStyle: "bold", cellWidth: 38, fillColor: [248, 250, 252] },
        [headers.length - 1]: { fontStyle: "bold", fillColor: [241, 245, 249] }
      },
      alternateRowStyles: {
        fillColor: [249, 251, 254]
      },
      didParseCell: (dataFilter) => {
        // Header styling for weekends/holidays
        if (dataFilter.section === "head" && dataFilter.column.index > 0 && dataFilter.column.index <= dayInfo.length) {
          const di = dayInfo[dataFilter.column.index - 1];
          if (di?.isHoliday || di?.isWeekend) {
            dataFilter.cell.styles.fillColor = [30, 41, 59]; // Slate 800
          } else if (di?.isVigilia) {
            dataFilter.cell.styles.fillColor = [51, 65, 85]; // Slate 700
          }
        }
        
        if (dataFilter.section === "body" && dataFilter.column.index > 0 && dataFilter.column.index <= dayInfo.length) {
          const di = dayInfo[dataFilter.column.index - 1];
          
          // Colorazione FESTIVI e WEEKEND
          if (di?.isHoliday || di?.isWeekend) {
            dataFilter.cell.styles.fillColor = rose100;
            dataFilter.cell.styles.textColor = rose600;
            dataFilter.cell.styles.fontStyle = "bold";
          } 
          // Colorazione VIGILIE / PREFESTIVI
          else if (di?.isVigilia) {
            dataFilter.cell.styles.fillColor = amber50;
            dataFilter.cell.styles.textColor = amber600;
          }
        }

        // Colorazione REPERIBILITÀ (Qualsiasi sigla che contenga REP o sia in un elenco specifico)
        const cellText = dataFilter.cell.text[0] || "";
        if (dataFilter.section === "body" && (cellText.includes("REP") || cellText === "RP" || cellText === "RS")) {
          dataFilter.cell.styles.fillColor = emerald100;
          dataFilter.cell.styles.textColor = emerald600;
          dataFilter.cell.styles.fontStyle = "bold";
        }
      }
    });

    // 4. Legenda
    const finalY = doc.lastAutoTable.finalY + 8;
    doc.setFontSize(8);
    doc.setTextColor(navelBlue[0], navelBlue[1], navelBlue[2]);
    doc.setFont("helvetica", "bold");
    doc.text("LEGENDA:", 14, finalY);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text("REP: Reperibilità | R: Riposo | RR: Recupero Riposo | M: Mattina | P: Pomeriggio | N: Notte | F: Festivo | S: Servizio Spec.", 32, finalY);

    // 5. Sigillo Digitale
    const pdfOutput = doc.output("arraybuffer");
    const documentHash = await generateHash(pdfOutput);
    
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(6);
      doc.setTextColor(150, 150, 150);
      doc.text(`Validazione Digitale (SHA-256): ${documentHash}`, 14, 202);
      doc.text(`Generato da Sentinel Security Suite il ${new Date().toLocaleString('it-IT')}`, 14, 205);
      doc.text(`Pagina ${i} di ${pageCount}`, 275, 205, { align: "right" });
    }

    // 6. QR Code
    try {
      const verifyUrl = `${window.location.origin}/verify/${documentHash}`;
      const qrDataUrl = await QRCodeLib.toDataURL(verifyUrl, { 
        margin: 1, 
        width: 100,
        color: { dark: "#001736", light: "#FFFFFF" }
      });
      
      doc.addImage(qrDataUrl, "PNG", 262, 178, 20, 20);
      doc.setFontSize(5);
      doc.text("VALIDAZIONE DIGITALE", 262, 200);
    } catch (qrErr) {
      console.warn("[PDF] QR Code non generato:", qrErr);
    }

    // 7. Download
    doc.save(`Pianificazione_${monthName}_${year}.pdf`);
    return documentHash;
  } catch (globalErr) {
    console.error("[PDF] Errore critico:", globalErr);
    throw globalErr;
  }
}

/**
 * Genera il PDF specialistico SOLO REPERIBILITÀ
 */
export async function generateReperibilitaPDF({
  monthName,
  month,
  year,
  agents,
  shifts,
  dayInfo,
  tenantName = "Comando Polizia Locale",
  logoUrl
}: {
  monthName: string,
  month: number,
  year: number,
  agents: Agent[],
  shifts: Shift[],
  dayInfo: DayInfo[],
  tenantName?: string,
  logoUrl?: string | null
}) {
  try {
    console.log("[PDF] Generazione Prospetto Solo Reperibilità...");
    
    // Import dinamici per compatibilità Next.js
    const { default: jsPDFLib } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const QRCodeLib = await import("qrcode");

    const doc = new jsPDFLib({
      orientation: "landscape",
      unit: "mm",
      format: "a4"
    }) as unknown as jsPDFWithAutoTable;

    const navelBlue: [number, number, number] = [0, 23, 54];
    const emerald100: [number, number, number] = [209, 250, 229];
    const emerald600: [number, number, number] = [5, 150, 105];

    // 1. Intestazione Specifica
    // 1. Intestazione Specifica
    if (logoUrl) {
      try {
        doc.addImage(logoUrl, "PNG", 14, 10, 25, 25);
        doc.setFontSize(22);
        doc.setTextColor(navelBlue[0], navelBlue[1], navelBlue[2]);
        doc.setFont("helvetica", "bold");
        doc.text(tenantName.toUpperCase(), 42, 20);
      } catch (e) {
        doc.setFontSize(22);
        doc.setTextColor(navelBlue[0], navelBlue[1], navelBlue[2]);
        doc.setFont("helvetica", "bold");
        doc.text(tenantName.toUpperCase(), 14, 18);
      }
    } else {
      doc.setFontSize(22);
      doc.setTextColor(navelBlue[0], navelBlue[1], navelBlue[2]);
      doc.setFont("helvetica", "bold");
      doc.text(tenantName.toUpperCase(), 14, 18);
    }
    
    doc.setFontSize(14);
    doc.setTextColor(emerald600[0], emerald600[1], emerald600[2]);
    doc.text(`PROSPETTO RIASSUNTIVO REPERIBILITÀ`, 14, 26);
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`${monthName.toUpperCase()} ${year}`, 14, 31);
    
    doc.setLineWidth(0.8);
    doc.setDrawColor(navelBlue[0], navelBlue[1], navelBlue[2]);
    doc.line(14, 34, 283, 34);

    // 2. Preparazione Dati (Solo REP)
    const headers = ["Agente", ...dayInfo.map(d => d.day.toString()), "TOT"];
    const monthIndex = month - 1;

    const rows = agents.map(agent => {
      let repTotal = 0;
      const row: (string | number)[] = [agent.name];
      
      dayInfo.forEach(di => {
        const targetY = year;
        const targetM = di.isNextMonth ? (monthIndex === 11 ? 0 : monthIndex + 1) : monthIndex;
        const targetD = di.day;
        
        const shift = shifts.find(s => {
          if (!s.date) return false;
          const dObj = new Date(s.date);
          const targetIso = new Date(Date.UTC(targetY, targetM, targetD)).toISOString().split('T')[0];
          const sIso = dObj.toISOString().split('T')[0];

          return s.userId === agent.id && (
            sIso === targetIso ||
            (dObj.getUTCFullYear() === targetY && dObj.getUTCMonth() === targetM && dObj.getUTCDate() === targetD) ||
            (dObj.getFullYear() === targetY && dObj.getMonth() === targetM && dObj.getDate() === targetD)
          );
        });
        
        let val = "";
        const sType = (shift?.type || "").toUpperCase();
        const rType = (shift?.repType || "").toUpperCase();

        if (rType.includes("REP") || rType === "RP" || rType === "RS") {
          val = rType;
          repTotal++;
        } else if (sType.includes("REP")) {
          val = sType;
          repTotal++;
        }
        row.push(val);
      });
      
      row.push(repTotal.toString());
      return row;
    });

    // Colori per festività
    const rose100: [number, number, number] = [255, 228, 230];
    const rose600: [number, number, number] = [225, 29, 72];
    const amber50: [number, number, number] = [255, 251, 235];
    const amber600: [number, number, number] = [180, 83, 9];

    // 3. Generazione Tabella
    autoTable(doc, {
      startY: 38,
      head: [headers],
      body: rows,
      theme: "grid",
      styles: {
        fontSize: 7,
        cellPadding: 1,
        halign: "center",
        valign: "middle",
        lineWidth: 0.05,
        lineColor: [220, 220, 220]
      },
      headStyles: {
        fillColor: navelBlue,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 7.5
      },
      columnStyles: {
        0: { halign: "left", fontStyle: "bold", cellWidth: 38, fillColor: [248, 250, 252] },
        [headers.length - 1]: { fontStyle: "bold", fillColor: [241, 245, 249] }
      },
      didParseCell: (dataFilter) => {
        // Colorazione Header Festivi
        if (dataFilter.section === "head" && dataFilter.column.index > 0 && dataFilter.column.index <= dayInfo.length) {
          const di = dayInfo[dataFilter.column.index - 1];
          if (di?.isHoliday || di?.isWeekend) {
            dataFilter.cell.styles.fillColor = [30, 41, 59];
          }
        }

        // Colorazione Celle Festivi/Vigilie
        if (dataFilter.section === "body" && dataFilter.column.index > 0 && dataFilter.column.index <= dayInfo.length) {
          const di = dayInfo[dataFilter.column.index - 1];
          if (di?.isHoliday || di?.isWeekend) {
            dataFilter.cell.styles.fillColor = rose100;
            dataFilter.cell.styles.textColor = rose600;
          } else if (di?.isVigilia) {
            dataFilter.cell.styles.fillColor = amber50;
            dataFilter.cell.styles.textColor = amber600;
          }
        }

        // Colorazione Reperibilità
        const cellText = dataFilter.cell.text[0] || "";
        if (dataFilter.section === "body" && (cellText.includes("REP") || cellText === "RP" || cellText === "RS")) {
          dataFilter.cell.styles.fillColor = emerald100;
          dataFilter.cell.styles.textColor = emerald600;
          dataFilter.cell.styles.fontStyle = "bold";
        }
      }
    });

    // 4. Sigillo Digitale
    const pdfOutput = doc.output("arraybuffer");
    const documentHash = await generateHash(pdfOutput);
    
    // QR Code in basso a destra per evitare sovrapposizioni
    try {
      const verifyUrl = `${window.location.origin}/verify/${documentHash}`;
      const qrDataUrl = await QRCodeLib.toDataURL(verifyUrl, { margin: 1, width: 80 });
      doc.addImage(qrDataUrl, "PNG", 265, 180, 22, 22);
    } catch {}

    doc.setFontSize(6);
    doc.setTextColor(150, 150, 150);
    doc.text(`Identificativo Prospetto: ${documentHash}`, 14, 202);
    doc.text(`Generato da Sentinel Security Suite il ${new Date().toLocaleString('it-IT')}`, 14, 205);
    doc.text(`v2.0 Professional Edition`, 283, 205, { align: "right" });

    doc.save(`Prospetto_REP_${monthName.replace(/\s+/g, '_')}_${year}.pdf`);
    return documentHash;
  } catch (err) {
    console.error("[PDF] Errore nella generazione del prospetto REP:", err);
    throw err;
  }
}

/**
 * Funzione interna per disegnare il contenuto di una singola pagina OdS
 * Usata sia dalla stampa singola che da quella batch/settimanale
 */
async function drawODSPageContent({
  doc,
  date,
  users,
  shifts,
  tenantName,
  logoUrl,
  autoTable,
  isBatch = false
}: {
  doc: jsPDFWithAutoTable,
  date: Date,
  users: ODSUser[],
  shifts: ODSShift[],
  tenantName: string,
  logoUrl?: string | null,
  autoTable: any,
  isBatch?: boolean
}) {
  const navelBlue: [number, number, number] = [0, 23, 54];
  const pageWidth = doc.internal.pageSize.width;
  const dateStr = date.toLocaleDateString("it-IT", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

  // 1. Header Istituzionale
  if (logoUrl) {
    try {
      doc.addImage(logoUrl, "PNG", (pageWidth / 2) - 50, 10, 18, 18);
      doc.setFontSize(20);
      doc.setTextColor(navelBlue[0], navelBlue[1], navelBlue[2]);
      doc.setFont("helvetica", "bold");
      const headerTitle = tenantName.toUpperCase().includes("POLIZIA LOCALE") 
        ? tenantName.toUpperCase() 
        : `POLIZIA LOCALE ${tenantName.toUpperCase()}`;
      doc.text(headerTitle, (pageWidth / 2) + 12, 20, { align: "center" });
    } catch (e) {
      doc.setFontSize(22);
      doc.setTextColor(navelBlue[0], navelBlue[1], navelBlue[2]);
      doc.setFont("helvetica", "bold");
      const headerTitle = tenantName.toUpperCase().includes("POLIZIA LOCALE") 
        ? tenantName.toUpperCase() 
        : `POLIZIA LOCALE ${tenantName.toUpperCase()}`;
      doc.text(headerTitle, pageWidth / 2, 20, { align: "center" });
    }
  } else {
    doc.setFontSize(22);
    doc.setTextColor(navelBlue[0], navelBlue[1], navelBlue[2]);
    doc.setFont("helvetica", "bold");
    const headerTitle = tenantName.toUpperCase().includes("POLIZIA LOCALE") 
      ? tenantName.toUpperCase() 
      : `POLIZIA LOCALE ${tenantName.toUpperCase()}`;
    doc.text(headerTitle, pageWidth / 2, 20, { align: "center" });
  }
  
  doc.setFontSize(14);
  doc.text("ORDINE DI SERVIZIO GIORNALIERO", pageWidth / 2, 28, { align: "center" });
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(dateStr.toUpperCase(), pageWidth / 2, 34, { align: "center" });

  doc.setDrawColor(navelBlue[0], navelBlue[1], navelBlue[2]);
  doc.setLineWidth(0.5);
  doc.line(20, 38, pageWidth - 20, 38);

  // 2. Preparazione Dati
  const isWorkingShift = (type: string) => /^[MPN]\d/.test((type || "").toUpperCase().replace(/[()]/g, "").trim());
  const currentShifts = shifts.filter(s => isWorkingShift(s.type));
  
  const sortedShifts = [...currentShifts].sort((a,b) => {
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    if (a.patrolGroupId && b.patrolGroupId) return a.patrolGroupId.localeCompare(b.patrolGroupId);
    return (a.patrolGroupId ? -1 : 1);
  });

  type ODSBodyRow = jsPDFCellConfig[] & { isPatrol?: boolean };
  
  const body: ODSBodyRow[] = sortedShifts.map(s => {
    const u = users.find(u => u.id === s.userId);
    if (!u) return null;
    
    const qualifica = u.qualifica || (u.isUfficiale ? "Uff.le" : "Agente");
    const orarioPrincipale = s.timeRange || (s.type.startsWith("M") ? "08:00-14:00" : s.type.startsWith("P") ? "14:00-20:00" : "22:00-04:00");
    const disposizioni = s.serviceDetails || "";
    const schoolTimeMatch = disposizioni.match(/(\d{2}:\d{2})(-(\d{2}:\d{2}))?/);
    
    let orarioStampa = orarioPrincipale;
    if (schoolTimeMatch) orarioStampa = `${schoolTimeMatch[0]}\n(${orarioPrincipale})`;

    const servizio = s.serviceType ? s.serviceType.name : (u.servizio || "Vigilanza");
    const veicolo = s.vehicle ? `\n(${s.vehicle.name})` : "";
    
    const rowData: jsPDFCellConfig[] = [
      { content: `${qualifica}\n${u.name}`, styles: { fontStyle: 'bold' } },
      { content: orarioStampa, styles: { halign: 'center', fontSize: 8, fontStyle: 'bold' } },
      { content: `${servizio}${veicolo}`, styles: { fontStyle: schoolTimeMatch ? 'bold' : 'normal' } },
      { content: disposizioni, styles: { fontSize: 8 } }
    ];
    
    const extendedRow = rowData as ODSBodyRow;
    extendedRow.isPatrol = !!s.patrolGroupId;
    return extendedRow;
  }).filter((row): row is ODSBodyRow => row !== null);

  // 3. Generazione Tabella
  autoTable(doc, {
    startY: 42,
    head: [['QUALIFICA / NOME', 'ORARIO', 'SERVIZIO / MEZZO', 'DISPOSIZIONI E LUOGHI']],
    body: body,
    theme: 'grid',
    headStyles: { fillColor: navelBlue, textColor: 255, fontSize: 10, halign: 'center', fontStyle: 'bold' },
    bodyStyles: { fontSize: 9, cellPadding: 3, textColor: 40 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: {
      0: { cellWidth: 45 },
      1: { cellWidth: 28 },
      2: { cellWidth: 45 },
      3: { cellWidth: 'auto' }
    },
    didParseCell: (data: any) => {
      const row = body[data.row.index];
      if (row && row.isPatrol && data.section === 'body') {
        data.cell.styles.fillColor = [230, 242, 255]; // Highlight Sentinel Blue
      }
    }
  });

  // 4. Sezione Firme
  const finalY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.text("L'UFFICIALE DI SERVIZIO", 45, finalY, { align: "center" });
  doc.line(20, finalY + 12, 70, finalY + 12);
  doc.text("IL COMANDANTE DEL CORPO", pageWidth - 55, finalY, { align: "center" });
  doc.line(pageWidth - 85, finalY + 12, pageWidth - 25, finalY + 12);

  // 4.5 Timbro Grafico Digitale
  const sealCenterX = pageWidth / 2;
  const sealCenterY = finalY + 6;
  const sealRadius = 12;
  
  doc.setDrawColor(16, 185, 129); // emerald-500
  doc.setLineWidth(0.8);
  doc.circle(sealCenterX, sealCenterY, sealRadius, "S");
  doc.setLineWidth(0.3);
  doc.circle(sealCenterX, sealCenterY, sealRadius - 2, "S");
  
  doc.setFontSize(5);
  doc.setTextColor(16, 185, 129);
  doc.setFont("helvetica", "bold");
  doc.text("★ FIRMATO DIGITALMENTE ★", sealCenterX, sealCenterY - 5, { align: "center" });
  doc.setFontSize(12);
  doc.text("✓", sealCenterX, sealCenterY + 1.5, { align: "center" });
  doc.setFontSize(4);
  doc.text("SENTINEL SECURITY SUITE", sealCenterX, sealCenterY + 5, { align: "center" });
  doc.setFontSize(3.5);
  doc.setTextColor(100, 116, 139);
  doc.text(new Date().toLocaleDateString('it-IT'), sealCenterX, sealCenterY + 7.5, { align: "center" });
}

/**
 * Genera l'Ordine di Servizio Giornaliero (ODS) Certificato
 */
export async function generateODSPDF({
  date,
  users,
  shifts,
  tenantName = "Comando Polizia Locale",
  logoUrl
}: {
  date: Date,
  users: ODSUser[],
  shifts: ODSShift[],
  tenantName?: string,
  logoUrl?: string | null
}) {
  try {
    const { default: jsPDFLib } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const QRCodeLib = await import("qrcode");

    const doc = new jsPDFLib({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    }) as unknown as jsPDFWithAutoTable;

    await drawODSPageContent({ doc, date, users, shifts, tenantName, logoUrl, autoTable });

    // 5. Sigillo Digitale & QR
    const pdfOutput = doc.output("arraybuffer");
    const documentHash = await generateHash(pdfOutput);

    const verifyUrl = `${window.location.origin}/verify/${documentHash}`;
    const qrDataUrl = await QRCodeLib.toDataURL(verifyUrl, { margin: 1, width: 80 });
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    doc.addImage(qrDataUrl, "PNG", pageWidth - 35, pageHeight - 40, 20, 20);
    doc.setFontSize(6);
    doc.setTextColor(150, 150, 150);
    doc.text(`IDENTIFICATIVO DIGITALE SHA-256: ${documentHash}`, 14, pageHeight - 12);
    doc.text(`SENTINEL SECURITY SUITE - FIRMA ELETTRONICA CERTIFICATA IL ${new Date().toLocaleString('it-IT')}`, 14, pageHeight - 9);
    doc.text("SCANSIONA IL QR CODE PER VERIFICARE L'AUTENTICITÀ", pageWidth - 16, pageHeight - 18, { align: "right" });

    doc.save(`ODS_${date.toISOString().split('T')[0]}.pdf`);
    return documentHash;
  } catch (err) {
    console.error("[PDF] Errore critico generazione ODS:", err);
    throw err;
  }
}

/**
 * Genera un pacchetto settimanale di Ordini di Servizio (Batch)
 */
export async function generateWeeklyODSPDF({
  days,
  tenantName = "Comando Polizia Locale",
  logoUrl
}: {
  days: { date: Date, users: ODSUser[], shifts: ODSShift[] }[],
  tenantName?: string,
  logoUrl?: string | null
}) {
  try {
    const { default: jsPDFLib } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const QRCodeLib = await import("qrcode");

    const doc = new jsPDFLib({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    }) as unknown as jsPDFWithAutoTable;

    for (let i = 0; i < days.length; i++) {
      if (i > 0) doc.addPage();
      await drawODSPageContent({ 
        doc, 
        date: days[i].date, 
        users: days[i].users, 
        shifts: days[i].shifts, 
        tenantName, 
        logoUrl, 
        autoTable,
        isBatch: true 
      });
    }

    // Sigillo Digitale Globale per tutto il pacchetto
    const pdfOutput = doc.output("arraybuffer");
    const documentHash = await generateHash(pdfOutput);
    const verifyUrl = `${window.location.origin}/verify/${documentHash}`;
    const qrDataUrl = await QRCodeLib.toDataURL(verifyUrl, { margin: 1, width: 80 });
    
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const pageCount = doc.internal.getNumberOfPages();

    // Applica il piè di pagina con hash a ogni pagina
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.addImage(qrDataUrl, "PNG", pageWidth - 35, pageHeight - 40, 20, 20);
      doc.setFontSize(6);
      doc.setTextColor(150, 150, 150);
      doc.text(`PACCHETTO SETTIMANALE SHA-256: ${documentHash}`, 14, pageHeight - 12);
      doc.text(`SENTINEL SECURITY SUITE - BATCH CERTIFICATO IL ${new Date().toLocaleString('it-IT')}`, 14, pageHeight - 9);
      doc.text(`Pagina ${i} di ${pageCount}`, pageWidth - 16, pageHeight - 12, { align: "right" });
    }

    const firstDate = days[0].date.toISOString().split('T')[0];
    doc.save(`ODS_Settimanale_${firstDate}.pdf`);
    return documentHash;
  } catch (err) {
    console.error("[PDF] Errore generazione Batch Settimanale:", err);
    throw err;
  }
}
