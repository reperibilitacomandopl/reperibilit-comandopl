import { auth } from "@/auth"
import { redirect } from "next/navigation"
import dynamicImport from "next/dynamic"
import Script from "next/script"

const ControlRoomMap = dynamicImport(() => import("@/components/ControlRoomMap"), { 
  ssr: false,
  loading: () => (
    <div className="flex flex-col h-[calc(100vh-120px)] bg-slate-950 rounded-[2.5rem] border border-white/5 animate-pulse items-center justify-center">
      <p className="text-slate-500 font-black uppercase tracking-widest text-xs text-center p-8">Inizializzazione Sistemi GPS...</p>
    </div>
  )
})

export const dynamic = "force-dynamic"

export default async function SalaOperativaPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  
  const hasAccess = 
    session.user.role === "ADMIN" || 
    session.user.canManageShifts || 
    session.user.isSuperAdmin

  if (!hasAccess) redirect("/login")

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <Script 
        src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
        strategy="beforeInteractive"
      />
      <link 
        rel="stylesheet" 
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="bg-indigo-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest shadow-lg shadow-indigo-500/20">Monitoraggio Live</span>
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Sentinel Command Center</span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">Centrale Operativa</h1>
          <p className="text-slate-400 font-medium mt-2">Visualizzazione geolocalizzata del personale in servizio attivo</p>
        </div>
      </div>

      <ControlRoomMap />
    </div>
  )
}
