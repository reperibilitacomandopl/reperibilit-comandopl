const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

async function main() {
  const p = new PrismaClient()
  const existing = await p.user.findFirst({ where: { isSuperAdmin: true } })
  if (existing) {
    console.log('SuperAdmin ESISTENTE:', existing.name, existing.matricola)
  } else {
    const hash = await bcrypt.hash('Admin2026!', 10)
    await p.user.create({
      data: {
        name: 'Super Admin',
        matricola: 'SUPERADMIN',
        email: 'admin@sentinel.it',
        password: hash,
        role: 'ADMIN',
        isSuperAdmin: true,
        isActive: true,
        forcePasswordChange: false
      }
    })
    console.log('SuperAdmin CREATO: matricola=SUPERADMIN password=Admin2026!')
  }
  await p.$disconnect()
}
main()
