import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('mese') || '');
    const year = parseInt(searchParams.get('anno') || '');
    const unsyncedOnly = searchParams.get('unsyncedOnly') === 'true';

    if (isNaN(month) || isNaN(year)) {
      return NextResponse.json({ error: 'Invalid month/year parameters' }, { status: 400 });
    }

    // Creiamo date inizio e fine mese (mese è 0-indexed in JS per Date)
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 1));

    // Troviamo i turni REP per il mese richiesto usando il modello 'shift'
    const assignments = await prisma.shift.findMany({
      where: {
        date: {
          gte: startDate,
          lt: endDate
        },
        repType: {
          contains: 'REP'
        },
        ...(unsyncedOnly ? { isSyncedToVerbatel: false } : {})
      },
      include: {
        user: {
          select: {
            name: true,
            matricola: true,
          }
        }
      }
    });

    // Raggruppiamo i risultati per matricola
    // Formato desiderato: [{ matricola: "362", agente: "FORTE MARIA", giorni: [1, 5, 12], shifts: [] }]
    const agentiMap = new Map<string, { matricola: string, agente: string, giorni: number[], shifts: any[] }>();

    for (const a of assignments) {
      // Alcuni utenti potrebbero non avere la matricola, in tal caso usiamo il nome o la skippiamo
      const matricola = a.user.matricola || a.user.name || 'SCONOSCIUTO';
      // Mese inizia da 1, giorno è un numero
      const day = new Date(a.date).getUTCDate(); 
      
      if (!agentiMap.has(matricola)) {
        agentiMap.set(matricola, {
          matricola: matricola,
          agente: a.user.name || 'Sconosciuto',
          giorni: [],
          shifts: []
        });
      }
      agentiMap.get(matricola)!.giorni.push(day);
      agentiMap.get(matricola)!.shifts.push({
        id: a.id,
        giorno: day,
        isSynced: a.isSyncedToVerbatel
      });
    }

    const result = Array.from(agentiMap.values()).map(a => {
        // Ordiniamo i giorni per comodità
        a.giorni.sort((x, y) => x - y);
        return a;
    });

    await logAudit({
      adminId: session.user.id || '',
      action: 'EXPORT_VERBATEL',
      details: `Export dati Verbatel per ${month}/${year}. Trovati ${result.length} agenti con reperibilità.`
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error exporting verbatel data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
