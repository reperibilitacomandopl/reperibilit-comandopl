import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("🔐 Generazione hash password...")
  const hash = await bcrypt.hash("Cambiami2026!", 10)
  
  console.log("💾 Aggiornamento database...")
  const result = await prisma.user.updateMany({
    where: { 
      role: "AGENTE",
      tenant: { slug: "altamura" }
    },
    data: { 
      password: hash, 
      forcePasswordChange: true 
    }
  })
  
  console.log(`✅ Successo! Reimpostate ${result.count} password per gli agenti.`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
