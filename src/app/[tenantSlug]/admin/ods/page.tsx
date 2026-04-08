import { redirect } from "next/navigation"
import { auth } from "@/auth"
import ServiceManagerPanel from "@/components/ServiceManagerPanel"

export const metadata = {
  title: "Ordine di Servizio | Comando PL",
}

export default async function OdsPage({ params }: { params: { tenantSlug: string } }) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  
  const { tenantSlug } = params

  return (
    <div className="h-full">
      <ServiceManagerPanel tenantSlug={tenantSlug} />
    </div>
  )
}
