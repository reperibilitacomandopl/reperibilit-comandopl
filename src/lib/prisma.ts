import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: any
}

const isEdge = process.env.NEXT_RUNTIME === 'edge'

const SOFT_DELETE_MODELS = ['User', 'Absence', 'Shift', 'AgentRequest', 'CertifiedDocument', 'AuditLog', 'ClockRecord', 'AgentBalance', 'Announcement', 'Notification', 'EmergencyAlert'];

const getExtendedClient = () => {
  const basePrisma = new PrismaClient()
  return basePrisma.$extends({
    model: {
      $allModels: {
        async findManyForTenant<T>(this: T, tenantId: string, args: any = {}) {
          const modelName = (this as any).name;
          const where: any = { ...args.where, tenantId };
          if (SOFT_DELETE_MODELS.includes(modelName)) {
            where.deletedAt = null;
          }
          return (this as any).findMany({ ...args, where });
        },
        async countForTenant<T>(this: T, tenantId: string, args: any = {}) {
          const modelName = (this as any).name;
          const where: any = { ...args.where, tenantId };
          if (SOFT_DELETE_MODELS.includes(modelName)) {
            where.deletedAt = null;
          }
          return (this as any).count({ ...args, where });
        }
      }
    },
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          if (SOFT_DELETE_MODELS.includes(model)) {
            (args as any).where = { ...(args.where as any), deletedAt: null }
          }
          return query(args)
        },
        async findFirst({ model, args, query }) {
          if (SOFT_DELETE_MODELS.includes(model)) {
            (args as any).where = { ...(args.where as any), deletedAt: null }
          }
          return query(args)
        },
        async findUnique({ model, args, query }) {
          if (SOFT_DELETE_MODELS.includes(model)) {
            (args as any).where = { ...(args.where as any), deletedAt: null }
          }
          return query(args)
        },
        async count({ model, args, query }) {
          if (SOFT_DELETE_MODELS.includes(model)) {
            (args as any).where = { ...(args.where as any), deletedAt: null }
          }
          return query(args)
        },
        async delete({ model, args, query }) {
          if (SOFT_DELETE_MODELS.includes(model)) {
            return (query as any).update({
              ...args,
              data: { deletedAt: new Date() }
            })
          }
          return query(args)
        },
        async deleteMany({ model, args, query }) {
          if (SOFT_DELETE_MODELS.includes(model)) {
            return (query as any).updateMany({
              ...args,
              data: { deletedAt: new Date() }
            })
          }
          return query(args)
        }
      },
    },
  })
}

export const prisma = isEdge 
  ? ({} as any) 
  : (globalForPrisma.prisma || (globalForPrisma.prisma = getExtendedClient()))

if (!isEdge && process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
