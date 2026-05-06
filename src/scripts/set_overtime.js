const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const shift = await prisma.shift.findFirst({
    where: { 
      date: new Date('2026-05-08T00:00:00Z'),
      user: { name: 'LATERZA NICOLA' }
    }
  });
  
  if (shift) {
    const updated = await prisma.shift.update({
      where: { id: shift.id },
      data: { overtimeHours: 2 }
    });
    console.log('Updated shift manually:', updated.overtimeHours);
  } else {
    console.log('Shift not found');
  }
}

main().finally(() => prisma.$disconnect());
