import { auth } from "@/auth"
import { redirect } from "next/navigation"
import ServiceManagerPanel from "@/components/ServiceManagerPanel"

export const dynamic = "force-dynamic"

export default async function GestioneOperativaPage() {
  const session = await auth()
  
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-slate-900 p-2 sm:p-4">
      <div className="max-w-[1600px] mx-auto h-[calc(100vh-2rem)] shadow-2xl rounded-3xl overflow-hidden bg-slate-100 relative">
        <ServiceManagerPanel />
      </div>
    </div>
  )
}
