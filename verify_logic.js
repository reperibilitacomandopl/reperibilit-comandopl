const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { resolveTheoreticalShift } = require('./src/utils/theoretical-shift');

async function test() {
  const agentName = 'ADAMUCCIO GIUSEPPE'; // Fixed rest day is Monday (1)
  const agent = await prisma.user.findFirst({
    where: { name: agentName },
    include: { rotationGroup: true }
  });
  
  if (!agent) {
    console.log('Agent not found');
    return;
  }
  
  const june1st = new Date(Date.UTC(2026, 5, 1)); // June 1st is Monday
  const result = resolveTheoreticalShift({
    user: agent,
    date: june1st,
    existingShifts: [],
    existingAbsences: []
  });
  
  console.log(`Agent: ${agentName}`);
  console.log(`Date: ${june1st.toISOString()}`);
  console.log(`Theoretical Shift: ${result}`);
  
  const isAssenza = result === 'R' || result.includes('RIP');
  console.log(`Is Rest/Absence? ${isAssenza}`);
}

test().catch(console.error).finally(() => prisma.$disconnect());
