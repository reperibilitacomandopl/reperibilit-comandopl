/* eslint-disable */
const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    where: { name: { contains: "MARIO" } },
    include: { tenant: true }
  })
  console.log("UTENTI TROVATI:")
  console.log(JSON.stringify(users, null, 2))
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
