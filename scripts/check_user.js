const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.findMany({ where: { name: { contains: 'BENEDETTO' } } })
  .then(u => {
    console.log(JSON.stringify(u, null, 2));
    process.exit(0);
  })
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
