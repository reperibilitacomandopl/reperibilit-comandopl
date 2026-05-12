import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function check() {
  const codes = await prisma.agentRequest.groupBy({
    by: ['code'],
    _count: { _all: true }
  })
  console.log("Codici attualmente presenti in AgentRequest:", JSON.stringify(codes, null, 2))
  
  const shiftTypes = await prisma.shift.groupBy({
    by: ['type'],
    _count: { _all: true }
  })
  console.log("Tipi di turno presenti in Shift:", JSON.stringify(shiftTypes, null, 2))
}

check()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
