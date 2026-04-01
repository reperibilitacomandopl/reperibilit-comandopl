import { auth } from "@/auth"
import { redirect } from "next/navigation"
import ServiceOrderDashboard from "@/components/ServiceOrderDashboard"

export const dynamic = "force-dynamic"

export default async function StampaOdsPage() {
  const session = await auth()
  
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-slate-900 p-0 sm:p-4 print:bg-white print:p-0">
      <div className="max-w-[1600px] mx-auto h-screen sm:h-[calc(100vh-2rem)] shadow-2xl sm:rounded-3xl overflow-hidden bg-slate-50 relative print:shadow-none print:h-auto print:rounded-none">
        <ServiceOrderDashboard />
      </div>
    </div>
  )
}
