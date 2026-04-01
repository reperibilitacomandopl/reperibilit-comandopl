import { auth } from "@/auth"
import { redirect } from "next/navigation"
import MonthlyShiftPlanner from "@/components/MonthlyShiftPlanner"

export const dynamic = "force-dynamic"

export default async function AssegnaTurniPage() {
  const session = await auth()
  
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login")
  }

  return (
    <div className="h-screen bg-slate-900 p-0 sm:p-2">
      <div className="w-full mx-auto h-full sm:h-[calc(100vh-1rem)] shadow-2xl sm:rounded-3xl overflow-hidden bg-slate-50 relative">
        <MonthlyShiftPlanner />
      </div>
    </div>
  )
}
