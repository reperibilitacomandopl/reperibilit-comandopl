const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 

async function main() { 
  const users = await prisma.user.findMany({ select: { name: true, gradoLivello: true, qualifica: true } }); 
  console.log(users.filter(u => u.name && (u.name.toLowerCase().includes('ontino') || u.gradoLivello !== null))); 
} 
main().catch(console.error).finally(() => prisma.$disconnect());
