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
  
  if (!tenantSlug) {
    // Caso d'emergenza: se non c'è lo slug (es. SuperAdmin globale), lo portiamo al login o a una dashboard globale
    if (session.user.isSuperAdmin) {
      redirect("/superadmin")
    }
    redirect("/login")
  }

  // Admin e SuperAdmin → Launchpad
  if (role === "ADMIN" || session.user.isSuperAdmin) {
    redirect(`/${tenantSlug}/admin`)
  }

  // Agenti → dashboard mobile
  redirect(`/${tenantSlug}`)
}