import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function run() {
  const agent = await prisma.user.findFirst({
    where: { name: { contains: 'dibenedetto', mode: 'insensitive' } }
  });
  if (!agent) { console.log('Agente non trovato'); return; }
  console.log('Trovato agente:', agent.name);

  // Trova turni di Maggio 2026
  const shifts = await prisma.shift.findMany({
    where: {
      userId: agent.id,
      date: {
        gte: new Date('2026-05-01T00:00:00Z'),
        lte: new Date('2026-05-31T23:59:59Z')
      }
    },
    orderBy: { date: 'asc' }
  });

  console.log('Shifts for May:', shifts.length);

  // Puliamo timbrature e richieste extra esistenti per questo utente a Maggio
  await prisma.clockRecord.deleteMany({
    where: { userId: agent.id, timestamp: { gte: new Date('2026-05-01T00:00:00Z'), lte: new Date('2026-05-31T23:59:59Z') } }
  });
  await prisma.agentRequest.deleteMany({
    where: { userId: agent.id, code: 'STR_EXTRA', date: { gte: new Date('2026-05-01T00:00:00Z'), lte: new Date('2026-05-31T23:59:59Z') } }
  });

  for (let i = 0; i < shifts.length; i++) {
    const s = shifts[i];
    const baseDate = new Date(s.date);
    const dateStr = baseDate.toISOString().split('T')[0];
    const type = (s.type || "").toUpperCase();

    // Se è un giorno di assenza o riposo, non timbriamo
    if (type.includes("FERIE") || type.includes("MALATTIA") || type === "R" || type === "RR" || type === "P") {
        console.log(`Giorno ${dateStr}: Assenza/Riposo (${type}), nessuna timbratura.`);
        continue;
    }

    let startHour = 8;
    let endHour = 14;

    if (type.startsWith("P")) {
        startHour = 14;
        endHour = 20;
    }

    // Aggiungiamo un po' di casualità (minuti random tra -5 e +5)
    const randomIn = Math.floor(Math.random() * 11) - 5;
    const randomOut = Math.floor(Math.random() * 11) - 5;

    const timestampIn = new Date(baseDate);
    timestampIn.setUTCHours(startHour - 2, randomIn, 0, 0); // -2 per UTC (se siamo in Italia +2)

    const timestampOut = new Date(baseDate);
    timestampOut.setUTCHours(endHour - 2, randomOut, 0, 0);

    // Ogni 4 turni facciamo uno straordinario di 1.5 ore
    let extraHours = 0;
    if (i % 4 === 0) {
        extraHours = 1.5;
        // Spostiamo l'uscita in avanti
        timestampOut.setUTCHours(timestampOut.getUTCHours() + 1, timestampOut.getUTCMinutes() + 30);
    }

    await prisma.clockRecord.create({
        data: { userId: agent.id, tenantId: agent.tenantId, type: 'IN', timestamp: timestampIn }
    });
    await prisma.clockRecord.create({
        data: { userId: agent.id, tenantId: agent.tenantId, type: 'OUT', timestamp: timestampOut }
    });

    if (extraHours > 0) {
        // Inseriamo anche la richiesta di straordinario per quel giorno
        await prisma.agentRequest.create({
            data: {
                userId: agent.id, tenantId: agent.tenantId, code: 'STR_EXTRA', status: 'APPROVED',
                date: baseDate, hours: extraHours, notes: 'Servizio prolungato per test'
            }
        });
        console.log(`Giorno ${dateStr}: Timbratura simulata ${startHour}:00-${endHour + extraHours}:00 (Straordinario di ${extraHours}h)`);
    } else {
        console.log(`Giorno ${dateStr}: Timbratura simulata ${startHour}:00-${endHour}:00`);
    }
  }

  console.log('Simulazione completata per tutto il mese!');
}

run().catch(console.error).finally(() => prisma.$disconnect());
