const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTenantsAndUsers() {
  console.log('--- Analisi Tenants e Utenti ---');
  
  const tenants = await prisma.tenant.findMany({
    include: {
      _count: {
        select: { users: true }
      }
    }
  });

  console.log('Tenants trovati:');
  tenants.forEach(t => {
    console.log(`- ${t.name} (Slug: ${t.slug}, ID: ${t.id}): ${t._count.users} utenti`);
  });

  // Mostra qualche utente dal nuovo tenant per capire se i dati sono incrociati
  const newTenant = tenants.find(t => t.slug === 'comandomateraprova');
  if (newTenant) {
    const usersInNewTenant = await prisma.user.findMany({
      where: { tenantId: newTenant.id },
      select: { name: true, tenantId: true }
    });
    console.log(`\nUtenti in ${newTenant.name}:`);
    usersInNewTenant.forEach(u => console.log(`  - ${u.name}`));
  }
}

checkTenantsAndUsers()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
