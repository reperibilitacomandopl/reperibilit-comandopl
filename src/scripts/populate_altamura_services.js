const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const tenantSlug = 'altamura'
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
  
  if (!tenant) {
    console.error('Tenant altamura not found')
    return
  }

  const categories = [
    {
      name: 'VIABILITÀ',
      types: [
        'Pronto Intervento 1', 'Pronto Intervento 2', 'Centro Storico', 
        'Estramurali', 'Piazza Zanardelli', 'Piazza Unità d\'Italia', 
        'Zona Stadio', 'FEDERICUS', 'Pattuglia estramurale', 'Disposizione Ufficiale Viabilità',
        'Capo Servizio Viabilità 1', 'Capo Servizio Viabilità 2'
      ]
    },
    {
      name: 'POLIZIA AMMINISTRATIVA',
      types: [
        'Polizia Commerciale', 'Polizia Edilizia', 'Polizia Ambientale', 
        'Capo Servizio Edilizia + Protezione Civile', 'Capo Servizio Commercio'
      ]
    },
    {
      name: 'UFFICIO',
      types: [
        'Piantone', 'Centrale Operativa', 'Ufficio Comando', 'Ufficio Ced e Verbali', 
        'Ufficio Ced', 'Capo Servizio Comando', 'Ufficiale Coordinamento e Controllo', 
        'Sottufficiale Coordinamento Personale', 'Capo Servizio Ced'
      ]
    },
    {
      name: 'SERVIZI ESTERNI',
      types: ['Scuole', 'Scuole 5', 'Mercato']
    },
    {
      name: 'FORMAZIONE',
      types: ['Corso di Aggiornamento']
    }
  ]

  for (const cat of categories) {
    let category = await prisma.serviceCategory.findFirst({
      where: { tenantId: tenant.id, name: cat.name }
    })

    if (!category) {
      category = await prisma.serviceCategory.create({
        data: {
          name: cat.name,
          tenantId: tenant.id,
          orderIndex: 0
        }
      })
    }

    for (const typeName of cat.types) {
      const existingType = await prisma.serviceType.findFirst({
        where: { categoryId: category.id, name: typeName }
      })

      if (!existingType) {
        await prisma.serviceType.create({
          data: {
            name: typeName,
            categoryId: category.id,
            tenantId: tenant.id
          }
        })
      }
    }
  }

  console.log('Services populated for Altamura')
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
