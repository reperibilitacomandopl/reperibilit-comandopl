// @ts-nocheck
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import EventODSManager from "@/components/EventODSManager"

export const dynamic = "force-dynamic"

export default async function EventiPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug: urlSlug } = await params
  const session = await auth()

  if (!session?.user) redirect("/login")
  if (session.user.role !== "ADMIN" && !session.user.isSuperAdmin) redirect(`/${urlSlug}`)

  return (
    <div className="p-6 lg:p-8 relative z-10 h-full">
      <EventODSManager
        tenantSlug={urlSlug}
        tenantName={session.user.tenantName || "Comando Polizia Locale"}
      />
    </div>
  )
}
