"use client"

import type { LucideIcon } from "lucide-react"
import Link from "next/link"
import {
  Calendar,
  FileText,
  MapPin,
  Clock,
  ClipboardList,
  RefreshCw,
  Shield,
  ShieldCheck,
  Palmtree,
  LayoutGrid,
  Megaphone,
  Wallet,
  Nfc,
  ShieldAlert
} from "lucide-react"

type Module = {
  id: string
  title: string
  desc: string
  icon: LucideIcon
  color: string
  view?: string
  href?: string
  action?: "riepilogo" | "sos"
}

export default function MobileAgentLaunchpad({
  tenantSlug,
  isClockedIn,
  onNavigate,
  onScrollRiepilogo,
  onSos,
}: {
  tenantSlug: string
  isClockedIn?: string | null
  onNavigate: (view: string) => void
  onScrollRiepilogo: () => void
  onSos: () => void
}) {
  const modules: Module[] = [
    { id: "riepilogo", title: "Riepilogo", desc: "Timbrature e prossimo turno", icon: Clock, color: "from-slate-700 to-slate-900", action: "riepilogo" },
    { id: "nfc", title: "Tag NFC", desc: "Timbratura badge automatica", icon: Nfc, color: "from-blue-600 to-indigo-600", href: "/nfc" },
    { id: "rep", title: "Reperibilità", desc: "Giorni REP e contatti", icon: ShieldCheck, color: "from-emerald-500 to-teal-600", view: "reperibilita" },
    { id: "turni", title: "I Miei Turni", desc: "Calendario e griglia", icon: Calendar, color: "from-blue-500 to-cyan-500", view: "planning" },
    { id: "cartellino", title: "Cartellino HR", desc: "Saldi e storico", icon: Wallet, color: "from-violet-500 to-purple-600", view: "cartellino" },
    { id: "ferie", title: "Ferie e Permessi", desc: "Saldi e rotazioni", icon: Palmtree, color: "from-amber-500 to-orange-500", view: "ferie" },
    { id: "richieste", title: "Richieste", desc: "Ferie, malattia, L.104", icon: ClipboardList, color: "from-purple-500 to-fuchsia-500", view: "requests" },
    { id: "scambi", title: "Scambi Turno", desc: "Proponi o accetta", icon: RefreshCw, color: "from-cyan-500 to-blue-500", view: "swaps" },
    { id: "interventi", title: "Interventi", desc: "Missioni assegnate", icon: MapPin, color: "from-indigo-500 to-violet-500", view: "interventions" },
    { id: "sinistri", title: "Sinistri", desc: "Rilievo incidenti", icon: ShieldAlert, color: "from-red-500 to-orange-500", href: `/${tenantSlug}/agent/sinistri` },
    { id: "relazioni", title: "Relazioni", desc: "Rapporto giornaliero", icon: FileText, color: "from-teal-500 to-cyan-600", href: `/${tenantSlug}/agent/relazioni` },
    { id: "verbali", title: "Verbali CDS", desc: "Emetti contravvenzioni", icon: FileText, color: "from-rose-500 to-pink-500", href: `/${tenantSlug}/agent/verbale/nuovo` },
    { id: "bacheca", title: "Bacheca", desc: "Avvisi del comando", icon: Megaphone, color: "from-sky-500 to-blue-600", view: "bacheca" },
    { id: "calendario", title: "Vista Annuale", desc: "Panoramica anno", icon: LayoutGrid, color: "from-teal-500 to-emerald-600", view: "planning" },
    { id: "sos", title: "SOS Emergenza", desc: "Allarme immediato", icon: Shield, color: "from-red-500 to-rose-600", action: "sos" },
  ]

  const handleModuleClick = (mod: Module) => {
    if (mod.action === "riepilogo") {
      onScrollRiepilogo()
      return
    }
    if (mod.action === "sos") {
      onSos()
      return
    }
    if (mod.view) {
      onNavigate(mod.view)
    }
  }

  const tileClass =
    "relative flex flex-col items-center text-center p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-lg active:scale-95 transition-all w-full"

  return (
    <div className="px-4 py-6 space-y-6">
      <div className="text-center mb-2">
        <h2 className="text-sm font-black text-slate-500 uppercase tracking-[0.25em]">
          Moduli operativi
        </h2>
        <p className="text-xs text-slate-500 mt-1">Tutte le sezioni dell&apos;area agente</p>
        {isClockedIn === "IN" && (
          <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-[10px] font-black uppercase">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            In Servizio
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {modules.map((mod) => {
          const inner = (
            <>
              {(mod.id === "riepilogo" || mod.id === "timbratura") && isClockedIn === "IN" && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              )}
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${mod.color} flex items-center justify-center text-white shadow-lg mb-3`}
              >
                <mod.icon size={22} />
              </div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white mb-1">{mod.title}</h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">{mod.desc}</p>
            </>
          )

          if (mod.href) {
            return (
              <Link key={mod.id} href={mod.href} className={tileClass}>
                {inner}
              </Link>
            )
          }

          return (
            <button
              key={mod.id}
              type="button"
              onClick={() => handleModuleClick(mod)}
              className={tileClass}
            >
              {inner}
            </button>
          )
        })}
      </div>
    </div>
  )
}
