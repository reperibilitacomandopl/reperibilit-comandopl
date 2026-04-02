import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany();
  const res = [];
  users.forEach(u => {
    const dup = users.filter(x => x.matricola === u.matricola || x.name === u.name);
    if(dup.length > 1) res.push({ id: u.id, name: u.name, matricola: u.matricola });
  });
  console.log('Dupes:', res);
}
main().finally(() => prisma.$disconnect());
