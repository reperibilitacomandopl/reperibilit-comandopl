import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const existingAdmin = await prisma.user.findUnique({
    where: { matricola: 'ADMIN' },
  })
  
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('password123', 10)
    const admin = await prisma.user.create({
      data: {
        matricola: 'ADMIN',
        name: 'Comandante',
        email: 'admin@comune.altamura.it',
        password: hashedPassword,
        role: 'ADMIN',
        isUfficiale: true,
      },
    })
    console.log('Admin creato:', admin.matricola)
  } else {
    console.log('Admin già esistente.')
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
