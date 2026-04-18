import { auth } from "@/auth"
import { redirect } from "next/navigation"
import MonthlyReport from "@/components/MonthlyReport"

export const dynamic = "force-dynamic"

export default async function ReportPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.role !== "ADMIN" && !session.user.isSuperAdmin && !session.user.canConfigureSystem) redirect("/login")

  return (
    <div className="p-6 lg:p-8 relative z-10">
      <MonthlyReport />
    </div>
  )
}
