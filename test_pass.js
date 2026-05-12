
const bcrypt = require('bcryptjs')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.findFirst({
    where: { matricola: '350' } // PIERRO MADDALENA
  })

  if (!user) {
    console.log('Utente 350 non trovato')
    return
  }

  const isMatch = await bcrypt.compare('password123', user.password)
  console.log(`Verifica password per ${user.name} (350): ${isMatch ? 'CORRETTA' : 'ERRATA'}`)
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
