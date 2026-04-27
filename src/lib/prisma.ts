import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

const basePrisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = basePrisma

/**
 * Estensione Prisma per l'isolamento Multi-Tenant (Fase 8.1)
 * Permette di creare un client "scopato" che inietta automaticamente il tenantId nelle query.
 */
export const prisma = basePrisma.$extends({
  model: {
    $allModels: {
      async findManyForTenant<T>(this: T, tenantId: string, args: any = {}) {
        return (this as any).findMany({
          ...args,
          where: {
            ...args.where,
            tenantId: tenantId
          }
        })
      },
      async countForTenant<T>(this: T, tenantId: string, args: any = {}) {
        return (this as any).count({
          ...args,
          where: {
            ...args.where,
            tenantId: tenantId
          }
        })
      }
    }
  },
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        // Logica di prevenzione: se la query ha tenantId, lo mantiene. 
        // In futuro possiamo forzare l'iniezione qui per ogni operazione.
        return query(args)
      },
    },
  },
})
