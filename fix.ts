import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const forte = await prisma.user.findFirst({ where: { name: { contains: 'FORTE MARIA', mode: 'insensitive' } } });
  const moramarco = await prisma.user.findFirst({ where: { name: { contains: 'MORAMARCO', mode: 'insensitive' } } });
  console.log('FORTE MARIA:', forte);
  console.log('MORAMARCO:', moramarco);
  
  if (forte) {
    await prisma.user.update({ where: { id: forte.id }, data: { servizio: 'Polizia Edilizia' } });
    console.log('Fixed FORTE MARIA to Polizia Edilizia');
  }
  if (moramarco) {
    await prisma.user.update({ where: { id: moramarco.id }, data: { servizio: 'Viabilità' } });
    console.log('Fixed MORAMARCO to Viabilità');
  }
}
main().finally(() => prisma.$disconnect());
