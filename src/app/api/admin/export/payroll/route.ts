// @ts-nocheck
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit"
import * as xlsx from "xlsx"
import { z } from "zod"

// ---------------------------------------------------------
// MOTORE MATEMATICO CALENDARIO ITALIANO (ALGORITMO GAUSS)
// ---------------------------------------------------------
function getPasqua(anno: number) {
  const a = anno % 19;
  const b = Math.floor(anno / 100);
  const c = anno % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mese = Math.floor((h + l - 7 * m + 114) / 31);
  const giorno = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(anno, mese - 1, giorno));
}

function getPasquetta(anno: number) {
  const pasqua = getPasqua(anno);
  pasqua.setUTCDate(pasqua.getUTCDate() + 1);
  return pasqua;
}

function isFestivo(date: Date) {
  if (date.getUTCDay() === 0) return true; // Domenica
  
  const d = date.getUTCDate();
  const m = date.getUTCMonth(); // 0-based
  
  // Festività Fisse
  if (m === 0 && d === 1) return true; // Capodanno
  if (m === 0 && d === 6) return true; // Epifania
  if (m === 3 && d === 25) return true; // Liberazione
  if (m === 4 && d === 1) return true; // Lavoro
  if (m === 5 && d === 2) return true; // Repubblica
  if (m === 7 && d === 15) return true; // Ferragosto
  if (m === 10 && d === 1) return true; // Tutti i Santi
  if (m === 11 && d === 8) return true; // Immacolata
  if (m === 11 && d === 25) return true; // Natale
  if (m === 11 && d === 26) return true; // S. Stefano
  
  // Festività Mobili
  const pasquetta = getPasquetta(date.getUTCFullYear());
  if (m === pasquetta.getUTCMonth() && d === pasquetta.getUTCDate()) return true;

  return false;
}

// ---------------------------------------------------------
// VALIDAZIONE PARAMETRI ESPORTAZIONE (ZOD DOGANA)
// ---------------------------------------------------------
const exportQuerySchema = z.object({
  month: z.number().min(1).max(12),
  year: z.number().min(2020)
});

export async function GET(req: Request) {
  const session = await auth()
  
  // Sicurezza d'accesso: Solo ADMIN o delegati alla logistica finanziaria
  if (session?.user?.role !== "ADMIN" && (!session?.user?.canManageShifts && !session?.user?.canManageUsers && !session?.user?.canConfigureSystem)) {
    return NextResponse.json({ error: "Accesso Non Autorizzato alle finanze" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const rawMonth = parseInt(searchParams.get("month") || "")
  const rawYear = parseInt(searchParams.get("year") || "")

  const parsed = exportQuerySchema.safeParse({ month: rawMonth, year: rawYear });
  if (!parsed.success) {
    return NextResponse.json({ error: "Formato temporale richiesto invalido per l'export." }, { status: 400 })
  }

  const { month, year } = parsed.data;

  try {
    const tenantId = session.user.tenantId
    const tf = tenantId ? { tenantId } : {}

    // 1. Fetch Agenti Attivi
    const agents = await prisma.user.findMany({
      where: { role: "AGENTE", isActive: true, ...tf },
      select: { id: true, name: true, matricola: true, qualifica: true },
      orderBy: { name: "asc" }
    })

    // 2. Definizione Mese (Start-End)
    const startDate = new Date(Date.UTC(year, month - 1, 1))
    const endDate = new Date(Date.UTC(year, month, 1))

    // 3. Prelievo Turnazioni nel Mese Selezionato
    const shifts = await prisma.shift.findMany({
      where: { date: { gte: startDate, lt: endDate }, ...tf },
      select: { userId: true, type: true, timeRange: true, durationHours: true, overtimeHours: true, date: true }
    })

    // 4. Analitica Motore Calcolo Indennità
    const payrollData = agents.map(agent => {
      const agentShifts = shifts.filter(s => s.userId === agent.id)
      
      let totalNotti = 0;
      let totalSerali = 0;
      let totalFestivi = 0;
      let totalStraordinari = 0;
      let presenzeTotali = 0;

      for(const s of agentShifts) {
        if (!s.type) continue;
        const upType = s.type.toUpperCase();

        if (upType === "R" || upType === "RR" || upType.includes("FERIE") || upType.includes("MALATTIA")) {
           continue; // Non conteggiato come turno operativo
        }

        presenzeTotali++;
        totalStraordinari += (s.overtimeHours || 0);

        // Controllo Notti e Serali
        if (upType.includes("N8") || upType.includes("NOTTE") || upType.includes("N ")) {
           totalNotti++;
        } else if (upType.includes("S ") || upType.includes("SERA") || upType === "S" || (s.timeRange && s.timeRange.includes("18:00-00:00"))) {
           totalSerali++;
        }

        // Controllo Festivi Incrociato Gauss
        if (isFestivo(new Date(s.date))) {
           totalFestivi++;
        }
      }

      return {
        "Matricola": agent.matricola,
        "Nome Agente": agent.name,
        "Qualifica": agent.qualifica || "Agente",
        "Giorni Operativi": presenzeTotali,
        // Colonne Indennità Economiche
        "Indennità Festiva (Turni)": totalFestivi,
        "Indennità Notturna (Turni)": totalNotti,
        "Indennità Serale (Turni)": totalSerali,
        "Extra / Straordinari (Ore)": totalStraordinari,
      }
    })

    // 5. Compilazione Foglio Excel
    const worksheet = xlsx.utils.json_to_sheet(payrollData)
    const workbook = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(workbook, worksheet, `Paghe_POLOC_${month}_${year}`)

    worksheet["!cols"] = [
      { wch: 15 }, // Matricola
      { wch: 35 }, // Nome
      { wch: 25 }, // Qualifica
      { wch: 18 }, // Operativi
      { wch: 28 }, // Festivi
      { wch: 28 }, // Notti
      { wch: 28 }, // Serali
      { wch: 28 }, // Straordinari
    ]

    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" })

    // 6. Registrazione permanente e sicura dell'Emissione Certificato
    await logAudit({
      tenantId: tenantId || null,
      adminId: session.user.id!,
      adminName: session.user.name!,
      action: "EXPORT_PAYROLL",
      details: `Emissione Foglio Presenze/Paghe generato in Excel. Mese di Riferimento: ${month}/${year}. Formato: XLSX.`
    })

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="Paghe_Presenze_Ragioneria_${month}_${year}.xlsx"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      }
    })

  } catch (error) {
    console.error("[RAGIONERIA EXPORT ERROR]", error)
    return NextResponse.json({ error: "Errore fatale del gestore calcolo Ragioneria" }, { status: 500 })
  }
}
