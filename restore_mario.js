const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function restoreMario() {
  console.log('--- Restore Mario to Altamura ---');
  
  // Trova altamura tenant
  const altamura = await prisma.tenant.findUnique({
    where: { slug: 'altamura' }
  });

  if (!altamura) {
    console.log('Altamura tenant non trovato');
    return;
  }

  // Trova Mario
  const mario = await prisma.user.findFirst({
    where: { name: { contains: 'DIBENEDETTO MARIO', mode: 'insensitive' } }
  });

  if (!mario) {
    console.log('Mario non trovato');
    return;
  }

  // Riporta Mario su Altamura
  await prisma.user.update({
    where: { id: mario.id },
    data: { tenantId: altamura.id }
  });

  console.log('✅ Mario è stato riportato su Altamura.');
}

restoreMario()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
