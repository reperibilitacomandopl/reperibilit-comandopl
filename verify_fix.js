const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const month = 5;
  const year = 2026;
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 1));

  // Simulating the API logic after my fix
  const shifts = await prisma.shift.findMany({
    where: {
      date: { gte: startDate, lt: endDate },
      repType: {
        contains: 'REP',
        mode: 'insensitive' // This is what I added
      }
    },
    include: {
      user: {
        select: { id: true, name: true, matricola: true }
      }
    }
  });

  const agentiMap = new Map();
  shifts.forEach(s => {
    const matricola = s.user.matricola || s.user.name || 'SCONOSCIUTO';
    if (!agentiMap.has(matricola)) {
      agentiMap.set(matricola, { agente: s.user.name, matricola, giorni: [], shiftIds: [] });
    }
    const day = new Date(s.date).getUTCDate();
    const entry = agentiMap.get(matricola);
    if (!entry.giorni.includes(day)) {
      entry.giorni.push(day);
      entry.shiftIds.push(s.id);
    }
  });

  console.log(`Found ${agentiMap.size} unique agents for May 2026 using insensitive filter.`);
  const sample = Array.from(agentiMap.values()).slice(0, 3);
  console.log('Sample data:', JSON.stringify(sample, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
