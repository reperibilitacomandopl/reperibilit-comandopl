"use client"

import Link from "next/link"
import {
  Calendar,
  FileText,
  MapPin,
  Clock,
  ClipboardList,
  RefreshCw,
  Shield,
  Palmtree,
  LayoutGrid,
  Megaphone,
  Wallet,
} from "lucide-react"

// Versione semplificata: solo Link, niente eventi o router.push()
export default function MobileAgentLaunchpad({ tenantSlug, isClockedIn }: { tenantSlug: string; isClockedIn?: string | null }) {
  const modules = [
    { id: "riepilogo", title: "Riepilogo", desc: "Timbrature e prossimo turno", icon: Clock, color: "from-slate-700 to-slate-900", href: `/${tenantSlug}?view=dashboard#riepilogo-operativo` },
    { id: "turni", title: "I Miei Turni", desc: "Calendario e griglia", icon: Calendar, color: "from-blue-500 to-cyan-500", href: `/${tenantSlug}?view=planning` },
    { id: "cartellino", title: "Cartellino HR", desc: "Saldi e storico", icon: Wallet, color: "from-violet-500 to-purple-600", href: `/${tenantSlug}?view=cartellino` },
    { id: "ferie", title: "Ferie e Permessi", desc: "Saldi e rotazioni", icon: Palmtree, color: "from-amber-500 to-orange-500", href: `/${tenantSlug}?view=ferie` },
    { id: "richieste", title: "Richieste", desc: "Ferie, malattia, L.104", icon: ClipboardList, color: "from-purple-500 to-fuchsia-500", href: `/${tenantSlug}?view=requests` },
    { id: "scambi", title: "Scambi Turno", desc: "Proponi o accetta", icon: RefreshCw, color: "from-cyan-500 to-blue-500", href: `/${tenantSlug}?view=swaps` },
    { id: "interventi", title: "Interventi", desc: "Missioni assegnate", icon: MapPin, color: "from-indigo-500 to-violet-500", href: `/${tenantSlug}?view=interventions` },
    { id: "verbali", title: "Verbali CDS", desc: "Emetti contravvenzioni", icon: FileText, color: "from-rose-500 to-pink-500", href: `/${tenantSlug}/agent/verbale/nuovo` },
    { id: "bacheca", title: "Bacheca", desc: "Avvisi del comando", icon: Megaphone, color: "from-sky-500 to-blue-600", href: `/${tenantSlug}?view=bacheca` },
    { id: "calendario", title: "Vista Annuale", desc: "Panoramica anno", icon: LayoutGrid, color: "from-teal-500 to-emerald-600", href: `/${tenantSlug}?view=planning` },
    { id: "sos", title: "SOS Emergenza", desc: "Allarme immediato", icon: Shield, color: "from-red-500 to-rose-600", href: `/${tenantSlug}?view=sos` },
  ]

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
        {modules.map((mod) => (
          <Link
            key={mod.id}
            href={mod.href}
            prefetch={false}
            className="relative flex flex-col items-center text-center p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-lg active:scale-95 transition-all"
          >
            {(mod.id === "riepilogo" || mod.id === "timbratura") && isClockedIn === "IN" && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            )}
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${mod.color} flex items-center justify-center text-white shadow-lg mb-3`}>
              <mod.icon size={22} />
            </div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white mb-1">{mod.title}</h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">{mod.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
