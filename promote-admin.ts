import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('--- AUDIT UTENTI ---')
  const user = await prisma.user.findFirst({
    where: { matricola: 'admin' }
  })
  
  if (!user) {
    console.log('ERRORE: Utente admin non trovato')
    return
  }

  if (!user.isSuperAdmin) {
    console.log('Promozione admin a Super-Admin in corso...')
    await prisma.user.update({
      where: { id: user.id },
      data: { isSuperAdmin: true }
    })
    console.log('✅ PROMOZIONE COMPLETATA!')
  } else {
    console.log('L\'utente admin è GIÀ un Super-Admin.')
  }

  const check = await prisma.user.findFirst({
    where: { matricola: 'admin' },
    select: { matricola: true, name: true, isSuperAdmin: true }
  })
  console.log('Stato finale:', check)
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
