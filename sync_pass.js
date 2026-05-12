
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Hash per 'password123'
const HASHED_PASSWORD = '$2b$10$d79oUqyF1aLlW9U6wK3yU.ih7RGzRSEvIBT2pyzzFuzxlqHg8qxha'

async function main() {
  const altamura = await prisma.tenant.findUnique({ where: { slug: 'altamura' } })
  if (!altamura) {
    console.log('Tenant Altamura non trovato')
    return
  }

  const result = await prisma.user.updateMany({
    where: { tenantId: altamura.id },
    data: { password: HASHED_PASSWORD }
  })

  console.log(`Successo! Password resettata per ${result.count} utenti di Altamura a 'password123'.`)
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
