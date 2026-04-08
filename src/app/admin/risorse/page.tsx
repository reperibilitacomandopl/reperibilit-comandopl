import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import RisorseTabs from "@/components/RisorseTabs"

export const dynamic = "force-dynamic"

export default async function RisorsePage() {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login")

  const tenantId = session.user.tenantId || "N0T-EX1ST1NG"

  const [users, rotationGroups, categories] = await Promise.all([
    prisma.user.findMany({
      where: { 
        role: "AGENTE",
        tenantId: tenantId
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        matricola: true,
        isUfficiale: true,
        email: true,
        phone: true,
        qualifica: true,
        gradoLivello: true,
        squadra: true,
        servizio: true,
        massimale: true,
        defaultServiceCategoryId: true,
        defaultServiceTypeId: true,
        rotationGroupId: true,
        rotationGroup: { select: { id: true, name: true } },
      },
    }),
    prisma.rotationGroup.findMany({ 
      where: { tenantId: tenantId },
      orderBy: { name: "asc" } 
    }),
    prisma.serviceCategory.findMany({ 
      where: { tenantId: tenantId },
      include: { types: true }, 
      orderBy: { orderIndex: "asc" } 
    }),
  ])

  return (
    <div className="p-6 lg:p-8 relative z-10 h-full">
      <RisorseTabs
        agents={users as any}
        rotationGroups={rotationGroups}
        categories={categories}
      />
    </div>
  )
}
