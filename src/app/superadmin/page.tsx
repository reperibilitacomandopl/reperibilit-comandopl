import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import SuperAdminDashboard from "@/components/SuperAdminDashboard"

export const dynamic = "force-dynamic"

export default async function SuperAdminPage() {
  const session = await auth()
  
  // Solo SuperAdmin può accedere a questa pagina
  if (!session?.user || !session.user.isSuperAdmin) {
    redirect("/login")
  }

  // Carica tutti i tenant con statistiche
  const tenants = await prisma.tenant.findMany({
    include: {
      _count: {
        select: {
          users: true,
          shifts: true,
          vehicles: true,
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return (
    <SuperAdminDashboard 
      tenants={tenants as any}
      currentUser={{
        id: session.user.id,
        name: session.user.name || "Super Admin"
      }}
    />
  )
}
