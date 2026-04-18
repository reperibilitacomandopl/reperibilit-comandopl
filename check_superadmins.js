const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSuperAdmins() {
  console.log('--- Ricerca Super Admin nel Database ---');
  
  const superAdmins = await prisma.user.findMany({
    where: { isSuperAdmin: true },
    select: { id: true, name: true, email: true, role: true }
  });

  if (superAdmins.length === 0) {
    console.log('❌ NESSUN Super Admin trovato.');
    
    // Vediamo l'ultimo utente creato per capire se sei tu
    const lastUser = await prisma.user.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { name: true, email: true }
    });
    if (lastUser) console.log('L\'ultimo utente registrato è:', lastUser.name, `(${lastUser.email})`);
    
  } else {
    console.log(`✅ Trovati ${superAdmins.length} Super Admin:`);
    superAdmins.forEach(u => {
      console.log(`- ${u.name} (${u.email}) [Ruolo: ${u.role}]`);
    });
  }
}

checkSuperAdmins()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
