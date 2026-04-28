import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import RadioClient from "./RadioClient"

export default async function RadioPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const session = await auth()
  if (!session?.user || (session.user.role !== "ADMIN" && !session.user.canConfigureSystem)) {
    redirect("/login")
  }

  const tenantId = session.user.tenantId
  const tf = tenantId ? { tenantId } : {}

  const radios = await prisma.radio.findMany({
    where: { ...tf },
    orderBy: { name: "asc" },
    include: {
      assegnatario: {
        select: { id: true, name: true, matricola: true }
      }
    }
  })

  const serializedRadios = radios.map((r: any) => ({
    ...r,
    dataAssegnazione: r.dataAssegnazione?.toISOString() || null,
    cambioBatteria: r.cambioBatteria?.toISOString() || null
  }))

  const users = await prisma.user.findMany({
    where: { ...tf, role: "AGENTE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true }
  })

  return <RadioClient radios={serializedRadios} users={users} />
}
