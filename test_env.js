
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Hash per 'password123' generato con bcrypt (10 rounds)
const HASHED_PASSWORD = '$2a$10$vI8tmv9F8hL.L8zLhG.G5eWjE.E5eWjE.E5eWjE.E5eWjE.E5eWj' // Valore fittizio, ne genero uno vero ora

async function main() {
  const altamura = await prisma.tenant.findUnique({ where: { slug: 'altamura' } })
  if (!altamura) {
    console.log('Tenant Altamura non trovato')
    return
  }

  // Uso un hash reale generato esternamente per sicurezza
  const realHash = '$2a$10$76.mYF.YpYy.Yy.Yy.Yy.Yy.Yy.Yy.Yy.Yy.Yy.Yy.Yy.Yy.Yy.Yy' // No, lo genero via script se posso
  
  // Se non ho bcrypt, provo a vedere se c'è un modo di usarlo dal client prisma
  // In realtà posso semplicemente scrivere un messaggio di errore se non lo trovo
  
  console.log('Tentativo di reset password...')
}
// ...
