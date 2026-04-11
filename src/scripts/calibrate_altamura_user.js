const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

async function main() {
  console.log("AGGIORNAMENTO COORDINATE ALTAMURA (DATI UTENTE)...")

  const updated = await prisma.tenant.update({
    where: { slug: "altamura" },
    data: {
      lat: 40.8268755,
      lng: 16.53325,
      clockInRadius: 200 // Aumentato a 200m per massima tolleranza
    }
  })
  
  console.log("SUCCESSO:")
  console.log(JSON.stringify(updated, null, 2))
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
