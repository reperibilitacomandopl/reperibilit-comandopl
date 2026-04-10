const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

async function main() {
  const tenants = await prisma.tenant.findMany({
    select: { id: true, name: true, slug: true, lat: true, lng: true, clockInRadius: true }
  })
  console.log("TENANTS CONFIGURATION:")
  console.log(JSON.stringify(tenants, null, 2))
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
