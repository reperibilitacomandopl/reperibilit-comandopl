import { auth } from "@/auth"
import { redirect } from "next/navigation"
import ServiceManagerPanel from "@/components/ServiceManagerPanel"

export const dynamic = "force-dynamic"

export default async function OperativaPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login")

  return (
    <div className="h-full relative z-10">
      <div className="h-[calc(100vh-0px)] overflow-hidden">
        <ServiceManagerPanel />
      </div>
    </div>
  )
}
