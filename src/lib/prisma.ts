import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: any
}

const isEdge = process.env.NEXT_RUNTIME === 'edge'

const getExtendedClient = () => {
  const basePrisma = new PrismaClient()
  return basePrisma.$extends({
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
          return query(args)
        },
      },
    },
  })
}

export const prisma = isEdge 
  ? ({} as any) 
  : (globalForPrisma.prisma || (globalForPrisma.prisma = getExtendedClient()))

if (!isEdge && process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

