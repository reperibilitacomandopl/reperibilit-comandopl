import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import AnagraficaPanel from "@/components/AnagraficaPanel"

export const dynamic = "force-dynamic"

export default async function AnagraficaPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login")

  const [users, rotationGroups, categories] = await Promise.all([
    prisma.user.findMany({
      where: { role: "AGENTE" },
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
        massimale: true,
        defaultServiceCategoryId: true,
        defaultServiceTypeId: true,
        rotationGroupId: true,
        rotationGroup: { select: { id: true, name: true } },
      },
    }),
    prisma.rotationGroup.findMany({ orderBy: { name: "asc" } }),
    prisma.serviceCategory.findMany({ include: { types: true }, orderBy: { orderIndex: "asc" } }),
  ])

  return (
    <div className="p-6 lg:p-8 relative z-10 h-full">
      <AnagraficaPanel
        agents={users as any}
        rotationGroups={rotationGroups}
        categories={categories}
      />
    </div>
  )
}
