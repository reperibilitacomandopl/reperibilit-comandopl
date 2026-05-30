// @ts-nocheck
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import EventiManager from "@/components/EventiManager"

export const dynamic = "force-dynamic"

export default async function EventiPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug: urlSlug } = await params
  const session = await auth()

  if (!session?.user) redirect("/login")
  if (session.user.role !== "ADMIN" && !session.user.isSuperAdmin) redirect(`/${urlSlug}`)

  return (
    <div className="p-6 lg:p-8 relative z-10 h-full">
      <EventiManager
        tenantSlug={urlSlug}
        tenantName={session.user.tenantName || "Comando Polizia Locale"}
        logoUrl={(session.user as any).tenantLogoUrl || null}
      />
    </div>
  )
}
