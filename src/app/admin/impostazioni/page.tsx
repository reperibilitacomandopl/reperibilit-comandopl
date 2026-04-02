import { auth } from "@/auth"
import { redirect } from "next/navigation"
import ImpostazioniPanel from "@/components/ImpostazioniPanel"

export const dynamic = "force-dynamic"

export default async function ImpostazioniPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login")

  return (
    <div className="p-6 lg:p-8 relative z-10 h-full">
      <ImpostazioniPanel />
    </div>
  )
}
