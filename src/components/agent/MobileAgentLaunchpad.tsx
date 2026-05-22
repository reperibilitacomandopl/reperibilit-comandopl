"use client"

import { useRouter } from "next/navigation"
import { Calendar, FileText, MapPin, Clock, ClipboardList, RefreshCw, Shield, Palmtree, Camera } from "lucide-react"

export default function MobileAgentLaunchpad({ tenantSlug, isClockedIn }: { tenantSlug: string; isClockedIn?: string | null }) {
  const router = useRouter()

  const modules = [
    {
      id: "turni",
      title: "I Miei Turni",
      description: "Calendario mensile, orari e assegnazioni",
      icon: Calendar,
      color: "from-blue-500 to-cyan-500",
      bg: "bg-blue-50 dark:bg-blue-950/30",
      action: () => {}, // tab planning
      tab: "planning"
    },
    {
      id: "timbratura",
      title: "Timbratura GPS",
      description: isClockedIn === "IN" ? "Sei in servizio — Tocca per uscire" : "Clock-in / Clock-out geolocalizzato",
      icon: Clock,
      color: "from-emerald-500 to-teal-500",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      action: () => {}, // tab dashboard (has clock button)
      tab: "dashboard",
      pulse: isClockedIn === "IN"
    },
    {
      id: "verbali",
      title: "Verbali CDS",
      description: "Emetti contravvenzioni, vedi lo storico",
      icon: FileText,
      color: "from-rose-500 to-pink-500",
      bg: "bg-rose-50 dark:bg-rose-950/30",
      action: () => router.push(`/${tenantSlug}/agent/verbale/nuovo`),
      secondary: "Lista Verbali",
      secondaryTab: "verbali"
    },
    {
      id: "ferie",
      title: "Ferie e Permessi",
      description: "Saldi, richieste, pianificazione ferie",
      icon: Palmtree,
      color: "from-amber-500 to-orange-500",
      bg: "bg-amber-50 dark:bg-amber-950/30",
      tab: "ferie"
    },
    {
      id: "interventi",
      title: "Interventi",
      description: "Missioni assegnate, navigazione, esito",
      icon: MapPin,
      color: "from-indigo-500 to-violet-500",
      bg: "bg-indigo-50 dark:bg-indigo-950/30",
      tab: "interventions"
    },
    {
      id: "richieste",
      title: "Richieste",
      description: "Ferie, malattia, L.104, permessi studio",
      icon: ClipboardList,
      color: "from-purple-500 to-fuchsia-500",
      bg: "bg-purple-50 dark:bg-purple-950/30",
      tab: "requests"
    },
    {
      id: "scambi",
      title: "Scambi Turno",
      description: "Proponi o accetta scambi con i colleghi",
      icon: RefreshCw,
      color: "from-cyan-500 to-blue-500",
      bg: "bg-cyan-50 dark:bg-cyan-950/30",
      tab: "swaps"
    },
    {
      id: "sos",
      title: "SOS Emergenza",
      description: "Allarme immediato alla centrale operativa",
      icon: Shield,
      color: "from-red-500 to-rose-600",
      bg: "bg-red-50 dark:bg-red-950/30",
      action: () => {
        // SOS viene gestito dal FloatingSosButton
        const btn = document.querySelector('[data-sos-button]') as HTMLElement
        btn?.click()
      }
    }
  ]

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
      <div className="text-center mb-2">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">
          Sentinel <span className="text-blue-500">Agent</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">Seleziona il modulo operativo</p>
        {isClockedIn === "IN" && (
          <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-[10px] font-black uppercase">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            In Servizio
          </div>
        )}
      </div>

      {/* Module Grid — 2 colonne */}
      <div className="grid grid-cols-2 gap-3">
        {modules.map((mod) => (
          <button
            key={mod.id}
            onClick={() => {
              if (mod.action) { mod.action(); return }
              // Trigger tab change via custom event
              if (mod.tab) {
                window.dispatchEvent(new CustomEvent("agent-tab-change", { detail: mod.tab }))
              }
              if (mod.secondaryTab) {
                // Long press or secondary action can go to list view
              }
            }}
            className={`relative flex flex-col items-center text-center p-4 rounded-2xl border border-slate-200 dark:border-slate-800 ${mod.bg} hover:shadow-lg hover:scale-[1.02] transition-all active:scale-95 group`}
          >
            {mod.pulse && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            )}
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${mod.color} flex items-center justify-center text-white shadow-lg mb-3 group-hover:scale-110 transition-transform`}>
              <mod.icon size={22} />
            </div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white mb-1">{mod.title}</h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">{mod.description}</p>
            {mod.secondary && (
              <span className="mt-2 text-[9px] font-bold text-blue-600 dark:text-blue-400">{mod.secondary} →</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
