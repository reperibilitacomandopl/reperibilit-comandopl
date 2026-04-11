const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

async function main() {
  console.log("AGGIORNAMENTO COORDINATE ALTAMURA...")

  const updated = await prisma.tenant.update({
    where: { slug: "altamura" },
    data: {
      lat: 40.826978,
      lng: 16.554378,
      clockInRadius: 150
    }
  })
  
  console.log("SUCCESSO:")
  console.log(JSON.stringify(updated, null, 2))
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
