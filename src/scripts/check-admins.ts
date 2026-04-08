import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { isSuperAdmin: true },
        { role: 'ADMIN' }
      ]
    },
    select: {
      name: true,
      matricola: true,
      role: true,
      isSuperAdmin: true,
      tenant: {
        select: { name: true }
      }
    }
  })
  
  console.log('--- UTENTI AMMINISTRATORI ---')
  console.log(JSON.stringify(users, null, 2))
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
