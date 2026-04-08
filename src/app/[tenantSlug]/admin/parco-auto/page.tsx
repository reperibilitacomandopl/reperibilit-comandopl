import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import ParcoAutoClient from "./ParcoAutoClient"

export const dynamic = "force-dynamic"

export default async function ParcoAutoPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const tenantId = session.user.tenantId
  if (!tenantId) redirect("/admin/pannello")

  const vehicles = await prisma.vehicle.findMany({
    where: { tenantId },
    orderBy: { name: "asc" }
  })

  return <ParcoAutoClient vehicles={JSON.parse(JSON.stringify(vehicles))} />
}
