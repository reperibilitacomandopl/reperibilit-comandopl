import { redirect } from "next/navigation"
import { auth } from "@/auth"
import ServiceManagerPanel from "@/components/ServiceManagerPanel"

export const metadata = {
  title: "Ordine di Servizio | Comando PL",
}

export default async function OdsPage() {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") redirect("/login")

  return (
    <div className="h-full">
      <ServiceManagerPanel />
    </div>
  )
}
