const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function promoteToSuperAdmin() {
  const nameToSearch = "DIBENEDETTO MARIO";
  console.log(`--- Promozione Super Admin: ${nameToSearch} ---`);
  
  const user = await prisma.user.findFirst({
    where: {
      name: { contains: nameToSearch, mode: 'insensitive' }
    }
  });

  if (!user) {
    console.log(`❌ UTENTE NON TROVATO: Assicurati che il nome "${nameToSearch}" sia corretto.`);
    return;
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { isSuperAdmin: true }
  });

  console.log(`✅ SUCCESSO! L'utente ${updatedUser.name} (${updatedUser.email}) è ora Super Admin.`);
}

promoteToSuperAdmin()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
