import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import SwapBoardClient from "./SwapBoardClient"

export const dynamic = "force-dynamic"

export default async function SwapBoardPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const tenantId = session.user.tenantId
  if (!tenantId) redirect("/admin/pannello")

  const swaps = await prisma.shiftSwapRequest.findMany({
    where: { tenantId },
    include: {
      requester: { select: { id: true, name: true, matricola: true } },
      shift: { select: { id: true, date: true, type: true, repType: true, timeRange: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 50
  })

  return <SwapBoardClient swaps={JSON.parse(JSON.stringify(swaps))} />
}
