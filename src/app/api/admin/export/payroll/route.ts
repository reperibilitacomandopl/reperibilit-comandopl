// @ts-nocheck
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit"
import * as xlsx from "xlsx"
import { z } from "zod"

// ---------------------------------------------------------
// MOTORE MATEMATICO CALENDARIO ITALIANO (ALGORITMO GAUSS E ORARIO)
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

function calcolaOreTurno(timeRange: string | null) {
  if (!timeRange) return 6; // base 6 ore standard se non c'è timeRange
  try {
    const parts = timeRange.split("-");
    if (parts.length !== 2) return 6;
    const [h1, m1] = parts[0].split(":").map(Number);
    const [h2, m2] = parts[1].split(":").map(Number);
    let diff = (h2 + m2/60) - (h1 + m1/60);
    if (diff < 0) diff += 24; // caso scavallo mezzanotte (Es 22:00-06:00 = 8 ore)
    return diff;
  } catch (e) {
    return 6;
  }
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

    // 2. Definizione Mese e Fetch dei Turni
    const startDate = new Date(Date.UTC(year, month - 1, 1))
    const endDate = new Date(Date.UTC(year, month, 1))

    const shifts = await prisma.shift.findMany({
      where: { date: { gte: startDate, lt: endDate }, ...tf },
      select: { userId: true, type: true, timeRange: true, durationHours: true, overtimeHours: true, date: true }
    })

    // 3. Fetch dei Permessi orari concessi per operare la decurtazione Smart
    const approvedRequests = await prisma.agentRequest.findMany({
      where: { date: { gte: startDate, lt: endDate }, status: 'APPROVED', hours: { gt: 0 }, ...tf },
      select: { userId: true, date: true, hours: true, code: true }
    })

    // 4. Analitica Motore Calcolo (Ore vs Gettoni)
    const payrollData = agents.map(agent => {
      const agentShifts = shifts.filter(s => s.userId === agent.id)
      const agentRequests = approvedRequests.filter(r => r.userId === agent.id)
      
      let oreFeriali = 0;
      let oreFestive = 0;
      let totalOrePermessi = 0;

      let totalStraordinari = 0;
      let totalNotti = 0;
      let totalSerali = 0;

      let giorniFerie = 0;
      let giorniMalattia = 0;
      let giorniRiposo = 0;
      let giorniL104 = 0;
      let altreAssenze = 0;
      let totaleBuoniPasto = 0;

      // Raggruppiamo i turni per giorno per calcolare i Buoni Pasto
      const turniPerGiorno: Record<string, typeof agentShifts> = {};

      for(const s of agentShifts) {
        if (!s.type) continue;
        const upType = s.type.toUpperCase().trim();

        // 🛑 CONTEGGIO ASSENZE GIORNALIERE INTERE
        if (upType === "R" || upType === "RR") {
           giorniRiposo++;
           continue; 
        }
        if (upType.startsWith("(")) {
           if (upType.includes("F")) giorniFerie++;
           else if (upType.includes("M")) giorniMalattia++;
           else if (upType.includes("L 104") || upType.includes("104")) giorniL104++;
           else altreAssenze++;
           continue;
        }

        const dateStr = new Date(s.date).toISOString().split('T')[0];
        if (!turniPerGiorno[dateStr]) turniPerGiorno[dateStr] = [];
        turniPerGiorno[dateStr].push(s);

        totalStraordinari += (s.overtimeHours || 0);

        // a. Ricavo le Ore Nominali del Turno
        let oreNominali = s.durationHours && s.durationHours !== 6 ? s.durationHours : calcolaOreTurno(s.timeRange);

        // b. Smart Deduction (Sottrazione Permessi Orari per quello specifico giorno)
        const shiftDateString = new Date(s.date).toISOString().split('T')[0];
        const permessiOggi = agentRequests.filter(r => new Date(r.date).toISOString().split('T')[0] === shiftDateString);
        
        let oreDaSottrarre = 0;
        for (const req of permessiOggi) {
           oreDaSottrarre += (req.hours || 0);
           totalOrePermessi += (req.hours || 0);
        }

        let oreLavorateNette = oreNominali - oreDaSottrarre;
        if (oreLavorateNette < 0) oreLavorateNette = 0; // Previene valori negativi

        // c. Assegnazione Oraria Paga base (Feriale vs Festivo)
        if (isFestivo(new Date(s.date))) {
           oreFestive += oreLavorateNette;
        } else {
           oreFeriali += oreLavorateNette;
        }

        // d. Assegnazione Maggiorazioni Disagiate (A Gettone e NON ad Ore)
        if (upType.includes("N8") || upType.includes("NOTTE") || upType.includes("N ")) {
           totalNotti++;
        } else if (upType.includes("S ") || upType.includes("SERA") || upType === "S" || (s.timeRange && s.timeRange.includes("18:00-00:00"))) {
           totalSerali++;
        }
      }

      // Calcolo Buoni Pasto
      for (const dateStr in turniPerGiorno) {
        const turniLavorati = turniPerGiorno[dateStr];
        if (turniLavorati.length === 0) continue;

        const fasceOrarie = turniLavorati
          .map(s => {
            let start = 0, end = 0, duration = 0;
            if (s.timeRange) {
              const parts = s.timeRange.split("-");
              if (parts.length === 2) {
                const [h1, m1] = parts[0].split(":").map(Number);
                const [h2, m2] = parts[1].split(":").map(Number);
                start = h1 + (m1 || 0)/60;
                end = h2 + (m2 || 0)/60;
                if (end < start) end += 24;
                duration = end - start;
              }
            } else {
               duration = s.durationHours && s.durationHours !== 6 ? s.durationHours : 6;
            }
            return { start, end, duration };
          })
          .sort((a, b) => a.start - b.start);

        let maturaBuono = false;

        // Regola 1: 7 ore continuative
        if (fasceOrarie.some(f => f.duration >= 7)) {
          maturaBuono = true;
        } 
        // Regola 2: 6 ore totali, max 2h pausa, intervallo min 10m, min 2h consecutive lavorate
        else if (fasceOrarie.length >= 2) {
          let oreTotali = 0;
          let pausaMax = 0;
          let pausaMin = 999;
          let turniValidi = 0; // turni >= 2 ore

          for (let i = 0; i < fasceOrarie.length; i++) {
            const f = fasceOrarie[i];
            oreTotali += f.duration;
            if (f.duration >= 2) turniValidi++;

            if (i > 0 && fasceOrarie[i-1].start !== 0) { // check if timeRange was parsed
              let pausa = fasceOrarie[i].start - fasceOrarie[i-1].end;
              if (pausa < 0) pausa += 24; // in caso di turno notturno spezzato
              if (pausa > pausaMax) pausaMax = pausa;
              if (pausa < pausaMin) pausaMin = pausa;
            }
          }

          // 10 minuti = 0.166...
          if (oreTotali >= 6 && turniValidi >= 2 && pausaMax <= 2 && pausaMin >= (10/60)) {
            maturaBuono = true;
          }
        }

        if (maturaBuono) {
          totaleBuoniPasto++;
        }
      }

      // Consegna al Foglio Excel
      return {
        "Matricola": agent.matricola,
        "Nome Agente": agent.name,
        "Qualifica": agent.qualifica || "Agente",
        "Ore Lavorate (Feriali)": oreFeriali,
        "Ore Lavorate (Festive)": oreFestive,
        "Permessi Orari Detratti": totalOrePermessi,
        // Maggiorazioni
        "Indennità Festiva (Turni)": oreFestive > 0 ? agentShifts.filter(s => s.type && !s.type.trim().startsWith("(") && isFestivo(new Date(s.date))).length : 0, 
        "Indennità Notturna (Turni)": totalNotti,
        "Indennità Serale (Turni)": totalSerali,
        "Extra / Straordinari (Ore)": totalStraordinari,
        // Assenze e Buoni Pasto
        "Buoni Pasto Maturati": totaleBuoniPasto,
        "Giorni Ferie (F)": giorniFerie,
        "Giorni Malattia (M)": giorniMalattia,
        "Giorni Riposo (R/RR)": giorniRiposo,
        "Giorni L. 104": giorniL104,
        "Altre Assenze": altreAssenze
      }
    })

    // 5. Compilazione Foglio Excel Ingrandito
    const worksheet = xlsx.utils.json_to_sheet(payrollData)
    const workbook = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(workbook, worksheet, `Paghe_POLOC_${month}_${year}`)

    worksheet["!cols"] = [
      { wch: 15 }, // Matricola
      { wch: 35 }, // Nome
      { wch: 25 }, // Qualifica
      { wch: 20 }, // Ore Feriali
      { wch: 20 }, // Ore Festive
      { wch: 22 }, // Permessi Detratti
      { wch: 22 }, // Gettoni Festivi
      { wch: 22 }, // Gettoni Notti
      { wch: 22 }, // Gettoni Serali
      { wch: 22 }, // Straordinari
      { wch: 20 }, // Buoni Pasto
      { wch: 15 }, // Ferie
      { wch: 18 }, // Malattia
      { wch: 20 }, // Riposo
      { wch: 15 }, // 104
      { wch: 15 }, // Altre
    ]

    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" })

    // 6. Registrazione permanente
    await logAudit({
      tenantId: tenantId || null,
      adminId: session.user.id!,
      adminName: session.user.name!,
      action: "EXPORT_PAYROLL",
      details: `Esportazione Ore Paghe/Presenze (Logica Calcolo Orario Netto). Mese: ${month}/${year}.`
    })

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="Esportazione_Oraria_Paghe_${month}_${year}.xlsx"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      }
    })

  } catch (error) {
    console.error("[RAGIONERIA EXPORT ERROR]", error)
    return NextResponse.json({ error: "Errore fatale del gestore calcolo Ragioneria" }, { status: 500 })
  }
}
