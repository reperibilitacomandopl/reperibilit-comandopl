import { auth } from "@/auth"
import { redirect } from "next/navigation"
import MonthlyShiftPlanner from "@/components/MonthlyShiftPlanner"

export const dynamic = "force-dynamic"

export default async function AutoCompilaPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login")

  return (
    <div className="h-full relative z-10">
      <div className="h-[calc(100vh-0px)] overflow-hidden">
        <MonthlyShiftPlanner />
      </div>
    </div>
  )
}
