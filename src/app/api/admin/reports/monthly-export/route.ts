import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { isHoliday } from "@/utils/holidays"

export async function GET(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && !session?.user?.canManageShifts) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const month = parseInt(searchParams.get("month") || new Date().getMonth() + 1 + "")
  const year = parseInt(searchParams.get("year") || new Date().getFullYear() + "")
  const tenantId = session.user.tenantId
  const tf = tenantId ? { tenantId } : {}

  try {
    const startDate = new Date(Date.UTC(year, month - 1, 1))
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59))

    const [users, shifts, agenda] = await Promise.all([
      prisma.user.findMany({
        where: { role: "AGENTE", ...tf },
        select: { id: true, name: true, matricola: true, qualifica: true }
      }),
      prisma.shift.findMany({
        where: { ...tf, date: { gte: startDate, lte: endDate } },
        select: { userId: true, date: true, type: true, repType: true, durationHours: true, overtimeHours: true }
      }),
      prisma.agendaEntry.findMany({
        where: { ...tf, date: { gte: startDate, lte: endDate } },
        select: { userId: true, code: true, hours: true }
      })
    ])

    // Fetch GlobalSettings per buoni pasto
    const settings = tenantId 
      ? await prisma.globalSettings.findUnique({ where: { tenantId } })
      : await prisma.globalSettings.findFirst();

    const bpTurnoContinuato = settings?.bpTurnoContinuato ?? 7.0;
    const bpStaccoMinTurno1 = settings?.bpStaccoMinTurno1 ?? 6.0;
    const bpStaccoMaxPausa = settings?.bpStaccoMaxPausa ?? 2.0;
    const bpStaccoMinTurno2 = settings?.bpStaccoMinTurno2 ?? 2.0;

    const csvRows = [
      ["MATRICOLA", "NOME", "QUALIFICA", "ORE STRAORDINARI", "BUONI PASTO", "TURNI_TOTALI", "TURNI_NOTTE", "REP_FEST", "REP_FER", "FERIE", "MALATTIA/ASSENZE"]
    ]

    users.forEach((u: any) => {
      const uShifts = shifts.filter((s: any) => s.userId === u.id)
      const uAgenda = agenda.filter((a: any) => a.userId === u.id)

      let overtime = 0
      let ferie = 0
      let repFest = 0
      let repFer = 0
      let altre_assenze = 0
      let buoni_pasto = 0
      let turni_notte = 0
      let turni_totali = 0

      // Raggruppiamo i turni per giorno per calcolare i Buoni Pasto
      const turniPerGiorno: Record<string, typeof uShifts> = {};

      uShifts.forEach((s: any) => {
        const type = (s.type || "").toUpperCase().trim();
        
        // Assenze Intere
        if (type === "R" || type === "RR") {
           // riposo, non fa nulla per questi contatori
           return; 
        }
        if (type.startsWith("(")) {
           if (type.includes("F")) ferie++;
           else if (type.includes("M") || type.includes("L 104") || type.includes("104")) altre_assenze++;
           else altre_assenze++;
           return;
        }

        const dateStr = new Date(s.date).toISOString().split('T')[0];
        if (!turniPerGiorno[dateStr]) turniPerGiorno[dateStr] = [];
        turniPerGiorno[dateStr].push(s);

        turni_totali += 1;
        if (type.includes("N8") || type.includes("NOTTE") || type.includes("N ")) turni_notte += 1;
        overtime += s.overtimeHours || 0;

        if (s.repType && s.repType.toLowerCase().includes("rep")) {
          const shiftDate = new Date(s.date)
          if (isHoliday(shiftDate)) {
            repFest += 1
          } else {
            repFer += 1
          }
        }
      })

      // Calcolo Buoni Pasto Avanzato
      for (const dateStr in turniPerGiorno) {
        const turniLavorati = turniPerGiorno[dateStr];
        if (turniLavorati.length === 0) continue;

        const fasceOrarie = turniLavorati
          .map((s: any) => {
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
          .sort((a: any, b: any) => a.start - b.start);

        let maturaBuono = false;

        if (fasceOrarie.some((f: any) => f.duration >= bpTurnoContinuato)) {
          maturaBuono = true;
        } else if (fasceOrarie.length >= 2) {
          let oreTotali = 0;
          let pausaMax = 0;
          let pausaMin = 999;
          let turniValidi = 0;

          for (let i = 0; i < fasceOrarie.length; i++) {
            const f = fasceOrarie[i];
            oreTotali += f.duration;
            if (f.duration >= bpStaccoMinTurno2) turniValidi++;

            if (i > 0 && fasceOrarie[i-1].start !== 0) {
              let pausa = fasceOrarie[i].start - fasceOrarie[i-1].end;
              if (pausa < 0) pausa += 24;
              if (pausa > pausaMax) pausaMax = pausa;
              if (pausa < pausaMin) pausaMin = pausa;
            }
          }

          if (oreTotali >= bpStaccoMinTurno1 && turniValidi >= 2 && pausaMax <= bpStaccoMaxPausa && pausaMin >= (10/60)) {
            maturaBuono = true;
          }
        }

        if (maturaBuono) {
          buoni_pasto++;
        }
      }

      // Add agenda absences
      uAgenda.forEach((a: any) => {
        if (a.code === "0015" || a.code === "0016") ferie += 1
        else if (["MAL", "VIS", "PER", "L104"].some(k => a.code.includes(k))) altre_assenze += 1
      })

      csvRows.push([
        u.matricola,
        u.name,
        u.qualifica || "",
        overtime.toFixed(1),
        buoni_pasto.toString(),
        turni_totali.toString(),
        turni_notte.toString(),
        repFest.toString(),
        repFer.toString(),
        ferie.toString(),
        altre_assenze.toString()
      ])
    })

    const csvContent = csvRows.map(e => e.join(";")).join("\n")

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="Export_Paghe_${year}_${month < 10 ? '0'+month : month}.csv"`
      }
    })
  } catch (error) {
    console.error("[MONTHLY EXPORT ERR]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
