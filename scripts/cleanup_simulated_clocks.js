const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const agent = await prisma.user.findFirst({
    where: { name: { contains: 'dibenedetto', mode: 'insensitive' } }
  });
  if (!agent) { console.log('Agente non trovato'); return; }
  console.log('Trovato agente per la pulizia:', agent.name);

  // Definiamo oggi (18 Maggio 2026) per non cancellare le timbrature odierne di test
  const todayStart = new Date('2026-05-18T00:00:00Z');
  const todayEnd = new Date('2026-05-18T23:59:59Z');

  // Cancella tutte le timbrature di maggio 2026 tranne quelle di oggi
  const deletedClocks = await prisma.clockRecord.deleteMany({
    where: {
      userId: agent.id,
      timestamp: {
        gte: new Date('2026-05-01T00:00:00Z'),
        lte: new Date('2026-05-31T23:59:59Z'),
        not: {
          gte: todayStart,
          lte: todayEnd
        }
      }
    }
  });
  console.log(`Eliminate ${deletedClocks.count} timbrature simulate di Maggio (escluso oggi).`);

  // Cancella tutte le richieste di straordinario simulate di maggio 2026 tranne quelle di oggi
  const deletedRequests = await prisma.agentRequest.deleteMany({
    where: {
      userId: agent.id,
      code: 'STR_EXTRA',
      notes: 'Servizio prolungato per test',
      date: {
        gte: new Date('2026-05-01T00:00:00Z'),
        lte: new Date('2026-05-31T23:59:59Z'),
        not: {
          gte: todayStart,
          lte: todayEnd
        }
      }
    }
  });
  console.log(`Eliminate ${deletedRequests.count} richieste di straordinario simulate di Maggio.`);
}

run().catch(console.error).finally(() => prisma.$disconnect());
