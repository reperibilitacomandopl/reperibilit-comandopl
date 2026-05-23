import { auth } from "@/auth"
import { redirect } from "next/navigation"
import LandingPage from "@/components/LandingPage"

export default async function RootPage() {
  const session = await auth()
  
  if (!session?.user) {
    // Visitatore non autenticato → mostra la landing page commerciale
    return <LandingPage />
  }

  const { tenantSlug, role } = session.user
  
  // SuperAdmin → pannello globale multi-tenant
  if (session.user.isSuperAdmin) {
    redirect("/superadmin")
  }

  if (!tenantSlug) {
    redirect("/login")
  }

  // Admin → Launchpad
  if (role === "ADMIN") {
    redirect(`/${tenantSlug}/admin`)
  }

  // Agenti e operatori → dashboard mobile
  redirect(`/${tenantSlug}`)
}