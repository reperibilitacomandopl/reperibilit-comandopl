const { PrismaClient } = require("@prisma/client")
const bcrypt = require("bcryptjs")
const prisma = new PrismaClient()

async function resetAdmin() {
  const hashedPassword = await bcrypt.hash("password123", 10)
  
  try {
    const admin = await prisma.user.findFirst({
      where: { matricola: "ADMIN" }
    })

    if (!admin) {
      console.log("Utente ADMIN non trovato")
      return
    }

    const updated = await prisma.user.update({
      where: { id: admin.id },
      data: { password: hashedPassword }
    })
    console.log(`Password resettata con successo per l'utente: ${updated.name} (ADMIN)`)
  } catch (err) {
    console.error("Errore nel reset password:", err.message)
  } finally {
    await prisma.$disconnect()
  }
}

resetAdmin()
