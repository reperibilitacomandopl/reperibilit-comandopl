import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { 
  Navigation, 
  CalendarDays, 
  Users, 
  FileText, 
  BarChart3, 
  Settings,
  Car,
  Shield,
  Clock
} from "lucide-react"

export const dynamic = "force-dynamic"

export default async function AdminLaunchpad({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params
  const session = await auth()
  
  if (!session?.user) redirect("/login")

  const MODULES = [
    {
      id: "centrale",
      title: "Centrale Operativa",
      description: "Mappa GPS, interventi, emergenze e timbrature in tempo reale",
      icon: Navigation,
      color: "bg-blue-500",
      shadow: "shadow-blue-500/20",
      href: `/${tenantSlug}/admin/sala-operativa`,
      features: ["Mappa GPS", "Registro Interventi", "SOS e Allarmi"]
    },
    {
      id: "pianificazione",
      title: "Turni e Pianificazione",
      description: "Generazione automatica turni, Ordini di Servizio e scambi",
      icon: CalendarDays,
      color: "bg-cyan-500",
      shadow: "shadow-cyan-500/20",
      href: `/${tenantSlug}/admin/pianificazione`,
      features: ["Griglia Mensile", "Stampa OdS", "Generatore Ciclico"]
    },
    {
      id: "personale",
      title: "Risorse Umane",
      description: "Gestione agenti, ferie, permessi, cartellino e straordinari",
      icon: Users,
      color: "bg-emerald-500",
      shadow: "shadow-emerald-500/20",
      href: `/${tenantSlug}/admin/cartellino`,
      features: ["Cartellino HR", "Piano Ferie", "Approvazioni"]
    },
    {
      id: "verbali",
      title: "Verbali e Contravvenzioni",
      description: "Emissione, notifica, pagamenti e statistiche Codice della Strada",
      icon: FileText,
      color: "bg-rose-500",
      shadow: "shadow-rose-500/20",
      href: `/${tenantSlug}/admin/verbali`,
      features: ["Lista Verbali", "Dashboard Incassi", "Integrazioni"]
    },
    {
      id: "risorse",
      title: "Logistica e Mezzi",
      description: "Parco auto, armeria, radio, manutenzioni e scadenze",
      icon: Car,
      color: "bg-amber-500",
      shadow: "shadow-amber-500/20",
      href: `/${tenantSlug}/admin/parco-auto`,
      features: ["Parco Auto", "Armeria", "Scadenze"]
    },
    {
      id: "report",
      title: "Statistiche e Sistema",
      description: "Dashboard Comandante, report mensili, audit log e configurazioni",
      icon: BarChart3,
      color: "bg-purple-500",
      shadow: "shadow-purple-500/20",
      href: `/${tenantSlug}/admin/comandante`,
      features: ["Report Mensile", "Audit Logs", "Impostazioni"]
    }
  ]

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-full">
      <div className="mb-10">
        <h1 className="text-3xl font-black text-white tracking-tight mb-2">
          Workspace <span className="text-blue-500">Hub</span>
        </h1>
        <p className="text-slate-400 text-sm">
          Seleziona il modulo operativo a cui desideri accedere.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {MODULES.map((mod) => (
          <Link 
            key={mod.id} 
            href={mod.href}
            className="group relative flex flex-col p-6 rounded-3xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all duration-300 overflow-hidden"
          >
            {/* Background Glow on Hover */}
            <div className={`absolute -inset-4 opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-2xl ${mod.color}`}></div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg ${mod.color} ${mod.shadow} transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3`}>
                  <mod.icon size={28} />
                </div>
                <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-white/30 group-hover:text-white transition-colors">
                  <Navigation size={14} className="rotate-45" />
                </div>
              </div>

              <h2 className="text-xl font-bold text-white mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-white/70">
                {mod.title}
              </h2>
              
              <p className="text-sm text-slate-400 mb-6 h-10">
                {mod.description}
              </p>

              <div className="space-y-2">
                {mod.features.map((feat, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs font-medium text-slate-500 group-hover:text-slate-300 transition-colors">
                    <div className="w-1 h-1 rounded-full bg-white/20 group-hover:bg-blue-400"></div>
                    {feat}
                  </div>
                ))}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
