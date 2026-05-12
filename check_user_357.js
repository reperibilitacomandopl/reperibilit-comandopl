const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { matricola: '357' },
    select: { id: true, name: true, squadra: true }
  });
  console.log('User 357 data:', JSON.stringify(user, null, 2));

  const today = new Date();
  const startOfDay = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(startOfDay.getDate() + 1);

  const shift = await prisma.shift.findFirst({
    where: { 
      userId: user?.id,
      date: { gte: startOfDay, lt: endOfDay }
    }
  });
  console.log('User 357 shift today:', JSON.stringify(shift, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
