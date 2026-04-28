const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

async function main() {
  const tenantSlug = "stress-test"
  console.log(`🚀 Starting stress test seed for tenant: ${tenantSlug}`)

  // 1. Create or get Tenant
  let tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: "Comando Stress Test",
        slug: tenantSlug,
        planType: "PREMIUM",
        maxAgents: 500
      }
    })
    console.log(`✅ Created tenant: ${tenant.id}`)
  }

  // 2. Create Agents
  const agentsToCreate = 120
  console.log(`👥 Creating ${agentsToCreate} agents...`)

  const agents = []
  for (let i = 1; i <= agentsToCreate; i++) {
    const matricola = `ST-${i.toString().padStart(3, '0')}`
    agents.push({
      tenantId: tenant.id,
      matricola,
      name: `Agente Stress ${i}`,
      role: "AGENTE",
      password: "password123", // In a real app this should be hashed
      isActive: true,
      servizio: i % 2 === 0 ? "Viabilità" : "Pronto Intervento",
      squadra: `Squadra ${Math.ceil(i / 10)}`
    })
  }

  // Use createMany if supported by the provider, otherwise loop
  try {
    const result = await prisma.user.createMany({
      data: agents,
      skipDuplicates: true
    })
    console.log(`✅ Created ${result.count} new agents.`)
  } catch (err) {
    console.log("⚠️ createMany failed or not supported, falling back to individual creates.")
    for (const agent of agents) {
      await prisma.user.upsert({
        where: { tenantId_matricola: { tenantId: tenant.id, matricola: agent.matricola } },
        update: agent,
        create: agent
      })
    }
  }

  // 3. Create some Training Records
  console.log("🎓 Creating training records...")
  const users = await prisma.user.findMany({ where: { tenantId: tenant.id }, take: 50 })
  const trainingData = users.map(u => ({
    tenantId: tenant.id,
    userId: u.id,
    courseName: "Corso Stress Test Sicurezza",
    category: "SIA",
    issueDate: new Date(),
    expiryDate: new Date(Date.now() + (Math.random() * 365 * 24 * 60 * 60 * 1000)),
    status: "VALID"
  }))

  try {
    await prisma.trainingRecord.createMany({
      data: trainingData,
      skipDuplicates: true
    })
    console.log("✅ Created training records.")
  } catch (err) {
    console.log("⚠️ trainingRecord.createMany failed, falling back.")
    for (const t of trainingData) {
      await prisma.trainingRecord.create({ data: t })
    }
  }

  console.log("🏁 Stress test seed completed!")
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
