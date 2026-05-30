import { isAssenzaProtetta } from "./shift-logic"
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
  serviceCategory?: { name: string } | null;
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
 * Applica un watermark diagonale "COPIA NON UFFICIALE"
 */
function applyWatermark(doc: jsPDFWithAutoTable, text: string = "COPIA NON UFFICIALE") {
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(60);
    doc.setTextColor(240, 240, 240); // Grigio chiarissimo quasi invisibile
    doc.setFont("helvetica", "bold");
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    doc.text(text, pageW / 2, pageH / 2, { 
      align: "center", 
      angle: 45,
      renderingMode: 'fill'
    });
  }
}

/**
 * Carica un'immagine da URL e la converte in Base64 per jsPDF
 * Gestisce CORS e formati diversi
 */
async function getBase64Image(url: string): Promise<{ data: string, format: string } | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const format = blob.type.split('/')[1].toUpperCase(); // e.g. "PNG", "JPEG"
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve({ data: reader.result as string, format: format === 'JPG' ? 'JPEG' : format });
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn("[PDF] Impossibile convertire immagine in base64:", e);
    return null;
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
  logoUrl,
  isPublished = true,
  showWatermark = false
}: {
  monthName: string,
  month: number,
  year: number,
  agents: Agent[],
  shifts: Shift[],
  dayInfo: DayInfo[],
  tenantName?: string,
  logoUrl?: string | null,
  isPublished?: boolean,
  showWatermark?: boolean
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
        const img = await getBase64Image(logoUrl);
        if (img) {
          doc.addImage(img.data, img.format, 14, 10, 25, 25);
        } else {
          // Fallback se fetch base64 fallisce (es. CORS) - prova caricamento diretto
          const format = logoUrl.toLowerCase().endsWith(".png") ? "PNG" : "JPEG";
          doc.addImage(logoUrl, format, 14, 10, 25, 25);
        }
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

    // Watermark BOZZA se non pubblicato
    if (!isPublished) {
      const addWatermark = (d: jsPDFWithAutoTable) => {
        d.setFontSize(90);
        d.setTextColor(220, 38, 38);
        d.setFont("helvetica", "bold");
        const pageW = d.internal.pageSize.getWidth();
        const pageH = d.internal.pageSize.getHeight();
        // Simulate opacity with very light color
        d.setTextColor(253, 226, 226); // Very light red
        d.text("BOZZA", pageW / 2, pageH / 2, { align: "center", angle: 35 });
        // Reset colors
        d.setTextColor(0, 0, 0);
      };
      addWatermark(doc);
      const origAddPage = doc.addPage.bind(doc);
      doc.addPage = (...args: any[]) => {
        const result = origAddPage(...args);
        addWatermark(doc);
        return result;
      };
    }

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

        if (rType.includes("REP")) {
          val = "REP";
          repTotal++;
        } else if (rType === "RP" || rType === "RS") {
          val = rType;
        } else if (sType.includes("REP")) {
          val = "REP";
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
        fontSize: 6.5,
        cellPadding: 0.8,
        halign: "center",
        valign: "middle",
        lineWidth: 0.05,
        lineColor: [220, 220, 220],
        minCellHeight: 6
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

    if (showWatermark) {
      applyWatermark(doc);
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
  logoUrl,
  showWatermark = false
}: {
  monthName: string,
  month: number,
  year: number,
  agents: Agent[],
  shifts: Shift[],
  dayInfo: DayInfo[],
  tenantName?: string,
  logoUrl?: string | null,
  showWatermark?: boolean
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
        const img = await getBase64Image(logoUrl);
        if (img) {
          doc.addImage(img.data, img.format, 14, 10, 25, 25);
        } else {
          const format = logoUrl.toLowerCase().endsWith(".png") ? "PNG" : "JPEG";
          doc.addImage(logoUrl, format, 14, 10, 25, 25);
        }
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

        if (rType.includes("REP") || sType.includes("REP")) {
          val = "REP";
          repTotal++;
        } else if (rType === "RP" || rType === "RS") {
          val = rType;
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
        fontSize: 6.5,
        cellPadding: 0.8,
        halign: "center",
        valign: "middle",
        lineWidth: 0.05,
        lineColor: [220, 220, 220],
        minCellHeight: 6
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

    if (showWatermark) {
      applyWatermark(doc);
    }

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
  generalNotes,
  autoTable,
  isBatch = false
}: {
  doc: jsPDFWithAutoTable,
  date: Date,
  users: ODSUser[],
  shifts: ODSShift[],
  tenantName: string,
  logoUrl?: string | null,
  generalNotes?: string,
  autoTable: any,
  isBatch?: boolean
}) {
  const navelBlue: [number, number, number] = [0, 23, 54];
  const pageWidth = doc.internal.pageSize.width;
  const dateStr = date.toLocaleDateString("it-IT", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

  // 1. Caricamento asincrono del logo (se presente) per averlo pronto per le pagine successive
  let preloadedImg: any = null;
  if (logoUrl) {
    try {
      preloadedImg = await getBase64Image(logoUrl);
    } catch (e) {
      console.warn("Impossibile pre-caricare il logo per il PDF:", e);
    }
  }

  // Funzione riutilizzabile per disegnare l'intestazione Comando + Logo su qualsiasi pagina
  const drawInstitutionalHeader = () => {
    if (preloadedImg) {
      doc.addImage(preloadedImg.data, preloadedImg.format, (pageWidth / 2) - 50, 10, 18, 18);
      doc.setFontSize(20);
      doc.setTextColor(navelBlue[0], navelBlue[1], navelBlue[2]);
      doc.setFont("helvetica", "bold");
      const headerTitle = tenantName.toUpperCase().includes("POLIZIA LOCALE") 
        ? tenantName.toUpperCase() 
        : `POLIZIA LOCALE ${tenantName.toUpperCase()}`;
      doc.text(headerTitle, (pageWidth / 2) + 12, 20, { align: "center" });
    } else if (logoUrl && !preloadedImg) {
      const format = logoUrl.toLowerCase().endsWith(".png") ? "PNG" : "JPEG";
      try { doc.addImage(logoUrl, format, (pageWidth / 2) - 50, 10, 18, 18); } catch(e){}
      doc.setFontSize(20);
      doc.setTextColor(navelBlue[0], navelBlue[1], navelBlue[2]);
      doc.setFont("helvetica", "bold");
      const headerTitle = tenantName.toUpperCase().includes("POLIZIA LOCALE") 
        ? tenantName.toUpperCase() 
        : `POLIZIA LOCALE ${tenantName.toUpperCase()}`;
      doc.text(headerTitle, (pageWidth / 2) + 12, 20, { align: "center" });
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
  };

  // Disegna l'intestazione sulla primissima pagina
  drawInstitutionalHeader();
  const drawnHeaderPages = new Set<number>([1]);

  // 2. Preparazione Dati
  const isWorkingShift = (type: string, details?: string) => {
    const t = (type || "").toUpperCase().replace(/[()]/g, "").trim();
    if (/^[MPN]($|\d)/.test(t)) return true;
    if (details && details.trim().length > 0 && !isAssenzaProtetta(t)) return true;
    return false;
  };
  const currentShifts = shifts.filter(s => isWorkingShift(s.type, s.serviceDetails || ""));

  // ═══════════════════════════════════════════════════════════════
  // TABELLA ODS - LAYOUT ISTITUZIONALE
  // Colonne dinamiche: SCUOLA visibile solo se ci sono assegnazioni
  // ═══════════════════════════════════════════════════════════════

  // Controlla se è domenica
  const isSunday = date.getDay() === 0;

  // Funzione per estrarre TUTTE le info scuola dalle disposizioni
  const extractSchoolInfo = (details: string): string => {
    if (!details) return "";
    const d = details.trim();

    // Pattern auto-scuole: "07:45-08:30 ENTRATA / 13:00-14:00 USCITA NomeScuola"
    // oppure: "16:00-16:30 USCITA NomeScuola"
    // oppure con +: "Vigilanza + 07:45-08:30 ENTRATA / 13:00-14:00 USCITA Sc. Golgota"
    const autoPattern = d.match(/(\d{2}:\d{2}[-–]\d{2}:\d{2}\s+(?:ENTRATA|USCITA)\s*(?:\/\s*\d{2}:\d{2}[-–]\d{2}:\d{2}\s+(?:ENTRATA|USCITA))?\s+.+)/i);
    if (autoPattern) return autoPattern[1].trim();

    // Pattern manuale: "Sc. Golgota 07:30-08:15" o "08:00-08:30 Sc. Golgota"
    const manualPattern = d.match(/(?:Sc\.?\s*[A-Za-zÀ-ú\s.'-]+\s*\d{2}:\d{2}[-–]\d{2}:\d{2}|\d{2}:\d{2}[-–]\d{2}:\d{2}\s*Sc\.?\s*[A-Za-zÀ-ú\s.'-]+)/i);
    if (manualPattern) return manualPattern[0].trim();

    // Keyword match: contiene ENTRATA, USCITA, SCUOLA
    if (/(?:ENTRATA|USCITA|SCUOLA)/i.test(d)) {
      // Prendi tutta la parte dopo il + se presente
      const parts = d.split(/\s*\+\s*/);
      const schoolPart = parts.find(p => /(?:ENTRATA|USCITA|SCUOLA)/i.test(p));
      if (schoolPart) return schoolPart.trim();
    }

    // Pattern generico "sc." o "scuola" seguito da un nome
    const scGeneric = d.match(/(?:scuola|sc\.?)\s+[A-Za-zÀ-ú\s.'-]+/i);
    if (scGeneric) return scGeneric[0].trim();

    return "";
  };

  // Pre-calcola se esistono scuole in TUTTI i turni operativi
  const hasAnySchool = !isSunday && currentShifts.some(s => {
    const info = extractSchoolInfo(s.serviceDetails || "");
    return info.length > 0;
  });

  const renderTable = (titolo: string, listaTurni: ODSShift[], startY: number) => {
    if (listaTurni.length === 0) return startY;

    // Separiamo Ufficiali e Agenti
    const ufficiali = listaTurni.filter(s => users.find(u => u.id === s.userId)?.isUfficiale);
    const agenti = listaTurni.filter(s => !users.find(u => u.id === s.userId)?.isUfficiale);

    // Raggruppiamo Agenti per categoria di servizio
    const gruppiAgenti: Record<string, ODSShift[]> = {};
    agenti.forEach(s => {
      const catName = s.serviceCategory ? s.serviceCategory.name : "ALTRI SERVIZI";
      if (!gruppiAgenti[catName]) gruppiAgenti[catName] = [];
      gruppiAgenti[catName].push(s);
    });

    type ODSBodyRow = any[] & { isPatrol?: boolean; isCategoryHeader?: boolean };
    const body: ODSBodyRow[] = [];

    // Ordinamento: pattuglia, poi nome
    const sortShifts = (list: ODSShift[]) => [...list].sort((a, b) => {
      const gA = a.patrolGroupId || "";
      const gB = b.patrolGroupId || "";
      if (gA !== gB) {
        if (gA === "") return 1;
        if (gB === "") return -1;
        return gA.localeCompare(gB);
      }
      return (users.find(u => u.id === a.userId)?.name || "").localeCompare(users.find(u => u.id === b.userId)?.name || "");
    });

    // Costruttore riga
    const buildRow = (s: ODSShift): ODSBodyRow | null => {
      const u = users.find(u => u.id === s.userId);
      if (!u) return null;

      const qualifica = u.qualifica || (u.isUfficiale ? "Uff.le" : "Agente");
      const orario = s.timeRange || (s.type.startsWith("M") ? "08:00-14:00" : s.type.startsWith("P") ? "14:00-20:00" : "22:00-04:00");
      const servizio = s.serviceType ? s.serviceType.name : (u.servizio || "Vigilanza");
      const details = s.serviceDetails || "";
      const veicolo = s.vehicle ? s.vehicle.name : "";
      const scuola = extractSchoolInfo(details);

      // Rimuovi info scuola dalle note per non duplicare
      let note = details;
      if (scuola) {
        note = note.replace(scuola, "").trim();
        // Pulisci separatori residui (+ , / - all'inizio o fine)
        note = note.replace(/^\s*[+\-–\/|:,]\s*/, "").replace(/\s*[+\-–\/|:,]\s*$/, "").trim();
      }

      // Zona: estrai e aggiungi sotto il servizio
      let servizioZona = servizio;
      const zonaMatch = note.match(/(?:zona|settore|area)\s+[A-Za-zÀ-ú\s.'-]+/i);
      if (zonaMatch) {
        servizioZona += `\n${zonaMatch[0].trim()}`;
        note = note.replace(zonaMatch[0], "").trim();
        note = note.replace(/^\s*[+\-–\/|:,]\s*/, "").replace(/\s*[+\-–\/|:,]\s*$/, "").trim();
      }

      // Costruiamo la riga (con o senza colonna scuola)
      const rowData: any[] = [
        { content: `${qualifica}\n${u.name}`, styles: { fontStyle: 'bold', fontSize: 7.5 } },
        { content: orario, styles: { halign: 'center', fontSize: 7, fontStyle: 'bold' } },
        { content: servizioZona, styles: { fontSize: 7 } },
      ];

      if (hasAnySchool) {
        rowData.push({ content: scuola, styles: { fontSize: 6.5, fontStyle: scuola ? 'bold' : 'normal' } });
      } else {
        // Se non c'è colonna scuola, metti la scuola nelle note (caso limite)
        if (scuola) note = note ? `${scuola} | ${note}` : scuola;
      }

      rowData.push({ content: veicolo, styles: { fontSize: 6.5 } });
      rowData.push({ content: note, styles: { fontSize: 6.5 } });
      rowData.push({ content: "", styles: { fontSize: 6 } }); // Colonna FIRMA (vuota per firma manuale)

      const extendedRow = rowData as ODSBodyRow;
      extendedRow.isPatrol = !!s.patrolGroupId;
      return extendedRow;
    };

    // Header di sezione/categoria
    const numCols = hasAnySchool ? 7 : 6;
    const addCategoryHeader = (label: string) => {
      const headerRow = [
        { content: label.toUpperCase(), colSpan: numCols, styles: { halign: 'center', fillColor: [235, 228, 246], textColor: [67, 20, 110], fontStyle: 'bold', fontSize: 7.5, cellPadding: 1.5 } }
      ] as ODSBodyRow;
      headerRow.isCategoryHeader = true;
      body.push(headerRow);
    };

    // Ufficiali
    if (ufficiali.length > 0) {
      addCategoryHeader("UFFICIALI");
      sortShifts(ufficiali).forEach(s => { const row = buildRow(s); if (row) body.push(row); });
    }

    // Categorie agenti
    Object.keys(gruppiAgenti).sort().forEach(catName => {
      addCategoryHeader(catName);
      sortShifts(gruppiAgenti[catName]).forEach(s => { const row = buildRow(s); if (row) body.push(row); });
    });

    // Colori header turno (scuri, istituzionali)
    const themeColors: Record<string, [number, number, number]> = {
      "MATTINA": [15, 82, 140],
      "POMERIGGIO": [160, 90, 10],
      "NOTTE": [55, 48, 120],
    };
    const headerColor = themeColors[titolo] || navelBlue;

    // Intestazioni colonne (dinamiche)
    const titleRow = [
      { content: `- ${titolo} -`, colSpan: numCols, styles: { halign: 'center', fillColor: headerColor, textColor: 255, fontSize: 9, fontStyle: 'bold', cellPadding: 2 } }
    ];

    const headRow: any[] = [
      { content: "QUALIFICA / NOME", styles: { halign: 'left' } },
      { content: "ORARIO", styles: { halign: 'center' } },
      { content: "SERVIZIO / ZONA", styles: { halign: 'left' } },
    ];
    if (hasAnySchool) headRow.push({ content: "SCUOLA", styles: { halign: 'center' } });
    headRow.push({ content: "VEICOLO", styles: { halign: 'center' } });
    headRow.push({ content: "NOTE", styles: { halign: 'left' } });
    headRow.push({ content: "FIRMA", styles: { halign: 'center' } });

    // Column widths (dinamiche) - margini ridotti a 6mm per lato = 198mm utili
    const colStyles: Record<number, any> = hasAnySchool
      ? { 0: { cellWidth: 35 }, 1: { cellWidth: 18 }, 2: { cellWidth: 30 }, 3: { cellWidth: 26 }, 4: { cellWidth: 20 }, 5: { cellWidth: 'auto' }, 6: { cellWidth: 35 } }
      : { 0: { cellWidth: 36 }, 1: { cellWidth: 20 }, 2: { cellWidth: 34 }, 3: { cellWidth: 22 }, 4: { cellWidth: 'auto' }, 5: { cellWidth: 36 } };

    // Rendering
    autoTable(doc, {
      startY: startY,
      showHead: 'everyPage',
      head: [titleRow, headRow],
      body: body,
      theme: 'grid',
      headStyles: { fillColor: headerColor, textColor: 255, fontSize: 7, halign: 'center', fontStyle: 'bold', cellPadding: 2 },
      bodyStyles: { fontSize: 7, cellPadding: 2, textColor: 30, lineColor: [200, 200, 200], lineWidth: 0.2 },
      alternateRowStyles: { fillColor: [250, 250, 252] },
      columnStyles: colStyles,
      margin: { left: 6, right: 6, top: 46 },
      didDrawPage: (data: any) => {
        // Ripeti l'intestazione istituzionale se siamo su una nuova pagina
        const pageNum = (doc as any).internal.getNumberOfPages();
        if (!drawnHeaderPages.has(pageNum)) {
          drawnHeaderPages.add(pageNum);
          drawInstitutionalHeader();
        }
      },
      didParseCell: (data: any) => {
        const row = body[data.row.index];
        if (row && row.isCategoryHeader && data.section === 'body') {
          data.cell.styles.fillColor = [235, 228, 246];
          data.cell.styles.textColor = [67, 20, 110];
        } else if (row && row.isPatrol && data.section === 'body') {
          data.cell.styles.fillColor = [232, 242, 255];
        }
      }
    });

    return (doc as any).lastAutoTable.finalY + 8;
  };


  // ── Filtraggio turni per macro-periodo ──
  const mattinieri = currentShifts.filter(s => !/^P/i.test((s.type||"").replace(/[()]/g,"")) && !/^N/i.test((s.type||"").replace(/[()]/g,"")));
  const pomeridiani = currentShifts.filter(s => /^P/i.test((s.type||"").replace(/[()]/g,"")));
  const notturni = currentShifts.filter(s => /^N/i.test((s.type||"").replace(/[()]/g,"")));

  let nextY = 46;
  nextY = renderTable("MATTINA", mattinieri, nextY);
  nextY = renderTable("POMERIGGIO", pomeridiani, nextY);
  nextY = renderTable("NOTTE", notturni, nextY);

  // ── Note Generali del Comando ──
  if (generalNotes && generalNotes.trim().length > 0) {
    autoTable(doc, {
      startY: nextY + 2,
      head: [["DISPOSIZIONI E NOTE GENERALI DEL COMANDO"]],
      body: [[generalNotes]],
      theme: 'grid',
      headStyles: { fillColor: [250, 245, 225], textColor: [100, 60, 10], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5, fillColor: [255, 255, 255], textColor: 30, cellPadding: 3 },
    });
    nextY = (doc as any).lastAutoTable.finalY + 5;
  }


  // 4. Sezione Firme
  const finalY = Math.max(nextY, (doc as any).lastAutoTable?.finalY || nextY) + 15;
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
  logoUrl,
  generalNotes,
  showWatermark = false
}: {
  date: Date,
  users: ODSUser[],
  shifts: ODSShift[],
  tenantName?: string,
  logoUrl?: string | null,
  generalNotes?: string,
  showWatermark?: boolean
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

    await drawODSPageContent({ doc, date, users, shifts, tenantName, logoUrl, generalNotes, autoTable });

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

    if (showWatermark) {
      applyWatermark(doc);
    }

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
  logoUrl,
  showWatermark = false
}: {
  days: { date: Date, users: ODSUser[], shifts: ODSShift[], generalNotes?: string }[],
  tenantName?: string,
  logoUrl?: string | null,
  showWatermark?: boolean
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
        generalNotes: days[i].generalNotes,
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

    if (showWatermark) {
      applyWatermark(doc);
    }

    const firstDate = days[0].date.toISOString().split('T')[0];
    doc.save(`ODS_Settimanale_${firstDate}.pdf`);
    return documentHash;
  } catch (err) {
    console.error("[PDF] Errore generazione Batch Settimanale:", err);
    throw err;
  }
}

/**
 * Genera l'Ordine di Servizio per un EVENTO SPECIALE
 * Rispetta lo stile istituzionale identico all'ODS giornaliero
 */
interface EventAssignmentPDF {
  name: string;
  timeRange: string;
  ordinaryHours: number;
  overtimeHours: number;
  projectHours: number;
  equipment: string;
}

export async function generateEventODSPDF({
  eventName,
  eventDescription,
  startDate,
  endDate,
  ordinanza,
  odsNotes,
  assignments,
  tenantName = "Comando Polizia Locale",
  logoUrl,
}: {
  eventName: string;
  eventDescription: string;
  startDate: Date;
  endDate: Date;
  ordinanza: string;
  odsNotes: string;
  assignments: EventAssignmentPDF[];
  tenantName?: string;
  logoUrl?: string | null;
}) {
  try {
    console.log("[PDF] Generazione ODS Evento Speciale:", eventName);

    const { default: jsPDFLib } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const QRCodeLib = await import("qrcode");

    const doc = new jsPDFLib({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    }) as unknown as jsPDFWithAutoTable;

    const navelBlue: [number, number, number] = [0, 23, 54];
    const amber600: [number, number, number] = [180, 83, 9];
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    const startStr = startDate.toLocaleDateString("it-IT", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
    const endStr = endDate.toLocaleDateString("it-IT", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
    const isSingleDay = startDate.toDateString() === endDate.toDateString();
    const dateLabel = isSingleDay ? startStr.toUpperCase() : `DAL ${startStr.toUpperCase()} AL ${endStr.toUpperCase()}`;

    // ── 1. Intestazione Istituzionale (identica all'ODS standard) ──
    let preloadedImg: any = null;
    if (logoUrl) {
      try { preloadedImg = await getBase64Image(logoUrl); } catch {}
    }

    if (preloadedImg) {
      doc.addImage(preloadedImg.data, preloadedImg.format, (pageWidth / 2) - 50, 10, 18, 18);
      doc.setFontSize(20);
      doc.setTextColor(navelBlue[0], navelBlue[1], navelBlue[2]);
      doc.setFont("helvetica", "bold");
      const headerTitle = tenantName.toUpperCase().includes("POLIZIA LOCALE") 
        ? tenantName.toUpperCase() 
        : `POLIZIA LOCALE ${tenantName.toUpperCase()}`;
      doc.text(headerTitle, (pageWidth / 2) + 12, 20, { align: "center" });
    } else {
      doc.setFontSize(22);
      doc.setTextColor(navelBlue[0], navelBlue[1], navelBlue[2]);
      doc.setFont("helvetica", "bold");
      const headerTitle = tenantName.toUpperCase().includes("POLIZIA LOCALE") 
        ? tenantName.toUpperCase() 
        : `POLIZIA LOCALE ${tenantName.toUpperCase()}`;
      doc.text(headerTitle, pageWidth / 2, 20, { align: "center" });
    }

    // Titolo ODS Evento (Amber per distinguerlo dall'ODS giornaliero blu)
    doc.setFontSize(14);
    doc.setTextColor(amber600[0], amber600[1], amber600[2]);
    doc.setFont("helvetica", "bold");
    doc.text("ORDINE DI SERVIZIO — EVENTO SPECIALE", pageWidth / 2, 28, { align: "center" });

    doc.setFontSize(12);
    doc.setTextColor(navelBlue[0], navelBlue[1], navelBlue[2]);
    doc.text(eventName.toUpperCase(), pageWidth / 2, 35, { align: "center" });

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(dateLabel, pageWidth / 2, 41, { align: "center" });

    doc.setDrawColor(navelBlue[0], navelBlue[1], navelBlue[2]);
    doc.setLineWidth(0.5);
    doc.line(20, 44, pageWidth - 20, 44);

    let nextY = 50;

    // ── 2. Info Box (Ordinanza + Descrizione) ──
    if (ordinanza || eventDescription) {
      const infoRows: any[][] = [];
      if (ordinanza) infoRows.push([{ content: `Rif. Normativo: ${ordinanza}`, styles: { fontStyle: 'bold', fontSize: 8 } }]);
      if (eventDescription) infoRows.push([{ content: eventDescription, styles: { fontSize: 7.5 } }]);

      autoTable(doc, {
        startY: nextY,
        body: infoRows,
        theme: 'plain',
        styles: { cellPadding: 3, textColor: 30 },
        margin: { left: 20, right: 20 },
      });
      nextY = (doc as any).lastAutoTable.finalY + 5;
    }

    // ── 3. Tabella Personale Assegnato ──
    const headRow = [
      { content: "N.", styles: { halign: 'center' } },
      { content: "PERSONALE", styles: { halign: 'left' } },
      { content: "ORARIO", styles: { halign: 'center' } },
      { content: "ORE ORD.", styles: { halign: 'center' } },
      { content: "STRAORD.", styles: { halign: 'center' } },
      { content: "PROGETTO", styles: { halign: 'center' } },
      { content: "DOTAZIONI", styles: { halign: 'left' } },
      { content: "FIRMA", styles: { halign: 'center' } },
    ];

    const bodyRows = assignments.map((a, i) => [
      { content: String(i + 1), styles: { halign: 'center', fontSize: 7 } },
      { content: a.name, styles: { fontStyle: 'bold', fontSize: 7.5 } },
      { content: a.timeRange, styles: { halign: 'center', fontSize: 7, fontStyle: 'bold' } },
      { content: a.ordinaryHours > 0 ? String(a.ordinaryHours) : "—", styles: { halign: 'center', fontSize: 7 } },
      { content: a.overtimeHours > 0 ? String(a.overtimeHours) : "—", styles: { halign: 'center', fontSize: 7 } },
      { content: a.projectHours > 0 ? String(a.projectHours) : "—", styles: { halign: 'center', fontSize: 7 } },
      { content: a.equipment || "", styles: { fontSize: 6.5 } },
      { content: "", styles: { fontSize: 6 } }, // Firma manuale
    ]);

    // Riga totali
    const totalOrd = assignments.reduce((s, a) => s + a.ordinaryHours, 0);
    const totalStr = assignments.reduce((s, a) => s + a.overtimeHours, 0);
    const totalPrj = assignments.reduce((s, a) => s + a.projectHours, 0);

    const totalsRow = [
      { content: "", styles: {} },
      { content: "TOTALE", styles: { fontStyle: 'bold', fontSize: 8, halign: 'right' } },
      { content: "", styles: {} },
      { content: totalOrd > 0 ? String(totalOrd) + "h" : "—", styles: { halign: 'center', fontStyle: 'bold', fontSize: 7.5, textColor: [5, 150, 105] } },
      { content: totalStr > 0 ? String(totalStr) + "h" : "—", styles: { halign: 'center', fontStyle: 'bold', fontSize: 7.5, textColor: [180, 83, 9] } },
      { content: totalPrj > 0 ? String(totalPrj) + "h" : "—", styles: { halign: 'center', fontStyle: 'bold', fontSize: 7.5, textColor: [79, 70, 229] } },
      { content: "", styles: {} },
      { content: "", styles: {} },
    ];

    autoTable(doc, {
      startY: nextY,
      head: [
        [{ content: `— PERSONALE ASSEGNATO ALL'EVENTO —`, colSpan: 8, styles: { halign: 'center', fillColor: amber600, textColor: 255, fontSize: 9, fontStyle: 'bold', cellPadding: 2 } }],
        headRow
      ],
      body: [...bodyRows, totalsRow],
      theme: 'grid',
      headStyles: { fillColor: navelBlue, textColor: 255, fontSize: 7, halign: 'center', fontStyle: 'bold', cellPadding: 2 },
      bodyStyles: { fontSize: 7, cellPadding: 2, textColor: 30, lineColor: [200, 200, 200], lineWidth: 0.2 },
      alternateRowStyles: { fillColor: [250, 250, 252] },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 34 },
        2: { cellWidth: 22 },
        3: { cellWidth: 16 },
        4: { cellWidth: 16 },
        5: { cellWidth: 16 },
        6: { cellWidth: 'auto' },
        7: { cellWidth: 30 }
      },
      margin: { left: 6, right: 6 },
    });

    nextY = (doc as any).lastAutoTable.finalY + 6;

    // ── 4. Note ODS ──
    if (odsNotes && odsNotes.trim().length > 0) {
      autoTable(doc, {
        startY: nextY,
        head: [["DISPOSIZIONI E NOTE PER L'EVENTO"]],
        body: [[odsNotes]],
        theme: 'grid',
        headStyles: { fillColor: [250, 245, 225], textColor: [100, 60, 10], fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 7.5, fillColor: [255, 255, 255], textColor: 30, cellPadding: 3 },
        margin: { left: 6, right: 6 },
      });
      nextY = (doc as any).lastAutoTable.finalY + 5;
    }

    // ── 5. Sezione Firma Comandante ──
    const finalY = Math.max(nextY, 200) + 15;
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text("IL COMANDANTE DEL CORPO", pageWidth / 2, finalY, { align: "center" });
    doc.line(pageWidth / 2 - 30, finalY + 12, pageWidth / 2 + 30, finalY + 12);

    // ── 5.5 Timbro Digitale (uguale allo standard) ──
    const sealCenterX = pageWidth - 35;
    const sealCenterY = finalY + 6;
    const sealRadius = 12;
    
    doc.setDrawColor(16, 185, 129);
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

    // ── 6. Hash Digitale & QR ──
    const pdfOutput = doc.output("arraybuffer");
    const documentHash = await generateHash(pdfOutput);

    try {
      const verifyUrl = `${window.location.origin}/verify/${documentHash}`;
      const qrDataUrl = await QRCodeLib.toDataURL(verifyUrl, { margin: 1, width: 80 });
      doc.addImage(qrDataUrl, "PNG", pageWidth - 35, pageHeight - 40, 20, 20);
    } catch {}

    doc.setFontSize(6);
    doc.setTextColor(150, 150, 150);
    doc.text(`IDENTIFICATIVO DIGITALE SHA-256: ${documentHash}`, 14, pageHeight - 12);
    doc.text(`SENTINEL SECURITY SUITE - ODS EVENTO SPECIALE CERTIFICATO IL ${new Date().toLocaleString('it-IT')}`, 14, pageHeight - 9);
    doc.text("SCANSIONA IL QR CODE PER VERIFICARE L'AUTENTICITÀ", pageWidth - 16, pageHeight - 18, { align: "right" });

    doc.save(`ODS_Evento_${eventName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
    return documentHash;
  } catch (err) {
    console.error("[PDF] Errore critico generazione ODS Evento:", err);
    throw err;
  }
}
