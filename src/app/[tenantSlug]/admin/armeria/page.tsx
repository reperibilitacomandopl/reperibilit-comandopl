import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import ArmoryClient from "./ArmoryClient"

export default async function ArmoryPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const session = await auth()
  if (!session?.user || (session.user.role !== "ADMIN" && !session.user.canConfigureSystem)) {
    redirect("/login")
  }

  const tenantId = session.user.tenantId
  const tf = tenantId ? { tenantId } : {}

  const weaponsRaw = await prisma.weapon.findMany({
    where: { ...tf },
    orderBy: { name: "asc" },
    include: {
      assegnatario: {
        select: { id: true, name: true, matricola: true }
      }
    }
  })

  const armorsRaw = await prisma.armor.findMany({
    where: { ...tf },
    orderBy: { name: "asc" },
    include: {
      assegnatario: {
        select: { id: true, name: true, matricola: true }
      }
    }
  })

  const users = await prisma.user.findMany({
    where: { ...tf, role: "AGENTE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true }
  })

  // Serialize dates to ISO strings for Client Component
  const serializedWeapons = weaponsRaw.map(w => ({
    ...w,
    dataAssegnazione: w.dataAssegnazione?.toISOString() || null
  }))

  const serializedArmors = armorsRaw.map(a => ({
    ...a,
    dataAssegnazione: a.dataAssegnazione?.toISOString() || null,
    scadenzaKevlar: a.scadenzaKevlar?.toISOString() || null
  }))

  return <ArmoryClient initialWeapons={serializedWeapons} initialArmors={serializedArmors} users={users} />
}
