import { auth } from "@/auth"
import { redirect } from "next/navigation"
import DashboardShell from "@/components/DashboardShell"
import CartellinoPanel from "@/components/admin/CartellinoPanel"

export default async function CartellinoPage({ params }: { params: { tenantSlug: string } }) {
  const session = await auth()

  if (!session || (session.user.role !== "ADMIN" && !session.user.canManageShifts)) {
    redirect(`/${params.tenantSlug}/login`)
  }

  return (
    <DashboardShell>
      <CartellinoPanel />
    </DashboardShell>
  )
}
