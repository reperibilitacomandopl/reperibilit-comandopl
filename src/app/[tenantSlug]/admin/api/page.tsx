import { auth } from "@/auth"
import { redirect } from "next/navigation"
import ApiDocsPanel from "@/components/ApiDocsPanel"

export const dynamic = "force-dynamic"

export default async function ApiDocsPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.role !== "ADMIN" && !session.user.isSuperAdmin && !session.user.canConfigureSystem) redirect("/login")

  return (
    <div className="p-6 lg:p-8 relative z-10">
      <ApiDocsPanel />
    </div>
  )
}
