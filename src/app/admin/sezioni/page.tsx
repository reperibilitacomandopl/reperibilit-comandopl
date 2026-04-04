import { redirect } from "next/navigation"
import { auth } from "@/auth"
import SezioniManager from "@/components/SezioniManager"

export const metadata = {
  title: "Gestione Sezioni e Servizi | Comando PL",
}

export default async function SezioniPage() {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") redirect("/login")

  return (
    <div className="h-full">
      <SezioniManager />
    </div>
  )
}
