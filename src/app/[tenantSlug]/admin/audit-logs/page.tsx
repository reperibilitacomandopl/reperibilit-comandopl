import { auth } from "@/auth"
import { redirect } from "next/navigation"
import AuditLogPanel from "@/components/AuditLogPanel"

export default async function AuditLogsPage() {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") redirect("/login")

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest shadow-lg shadow-emerald-500/20">Sicurezza Attiva</span>
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Tracciabilità Operativa</span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">Registri di Audit</h1>
          <p className="text-slate-400 font-medium mt-2">Monitoraggio di tutte le azioni amministrative e modifiche al sistema</p>
        </div>
      </div>

      <AuditLogPanel />
    </div>
  )
}
