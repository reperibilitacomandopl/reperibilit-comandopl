"use client"

import { useState, useEffect } from "react"
import {
  Users,
  Shield,
  AlertTriangle,
  CalendarDays,
  Activity,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  CarFront
} from "lucide-react"
import Link from "next/link"
import { isAssenza, isMalattia } from "@/utils/shift-logic"

interface PannelloOverviewProps {
  totalAgents: number
  totalVehicles: number
  pendingSwaps: number
  todayShifts: { 
    userId: string; 
    type: string; 
    repType: string | null; 
    timeRange: string | null;
    serviceCategory: { name: string } | null;
    serviceType: { name: string } | null;
    vehicle: { name: string } | null;
    patrolGroupId: string | null;
    user: { name: string; isUfficiale: boolean; qualifica: string | null } 
  }[]
  isPublished: boolean
  currentMonth: number
  currentYear: number
  settings: { massimaleAgente: number; massimaleUfficiale: number; minUfficiali: number } | null
}

const MESI = ["", "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"]

export default function PannelloOverview({ totalAgents, todayShifts, isPublished, currentMonth, currentYear, settings, totalVehicles, pendingSwaps }: PannelloOverviewProps) {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000) // aggiorna ogni 30 sec
    return () => clearInterval(timer)
  }, [])

  // Calcola statistiche giornaliere
  const assentiOggi = todayShifts.filter(s => isAssenza(s.type)).length
  const operativiOggi = totalAgents - assentiOggi
  const malattieOggi = todayShifts.filter(s => isMalattia(s.type)).length
  const ufficialiOggi = todayShifts.filter(s => s.user.isUfficiale && !isAssenza(s.type)).length
  const veicoliInUsoCount = new Set(todayShifts.filter(s => s.vehicle?.name).map(s => s.vehicle!.name)).size
  
  const targetUfficiali = settings?.minUfficiali ?? 1
  const ufficialiStatusOk = ufficialiOggi >= targetUfficiali

  const cards = [
    {
      label: "Forze sul Campo",
      value: operativiOggi,
      icon: Activity,
      color: "from-emerald-500 to-emerald-700",
      textColor: "text-emerald-50",
      sub: `${assentiOggi} assenti totali`,
    },
    {
      label: "Ufficiali Copertura",
      value: ufficialiOggi,
      icon: Shield,
      color: ufficialiStatusOk ? "from-blue-500 to-blue-700" : "from-rose-500 to-rose-700",
      textColor: ufficialiStatusOk ? "text-blue-50" : "text-rose-50",
      sub: ufficialiStatusOk ? `Target min. ${targetUfficiali} raggiunto` : `ATTENZIONE: Sotto target (${targetUfficiali})`,
    },
    {
      label: "Stato Autoparco",
      value: veicoliInUsoCount,
      icon: CarFront,
      color: "from-slate-600 to-slate-800",
      textColor: "text-slate-50",
      sub: `${totalVehicles - veicoliInUsoCount} veicoli liberi`,
    },
    {
      label: pendingSwaps > 0 ? "Eccezioni / Scambi" : "Eccezioni / Malattie",
      value: pendingSwaps > 0 ? pendingSwaps : malattieOggi,
      icon: AlertTriangle,
      color: pendingSwaps > 0 ? "from-amber-500 to-amber-700" : (malattieOggi > 0 ? "from-rose-500 to-rose-700" : "from-teal-500 to-teal-700"),
      textColor: "text-white",
      sub: pendingSwaps > 0 ? "Richieste in attesa di approvazione" : (malattieOggi > 0 ? "Malattie registrate oggi" : "Tutto regolare"),
    },
  ]

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Pannello Comando</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            {currentTime.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            {" — "}
            <span className="text-slate-400">{currentTime.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border ${isPublished ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
            {isPublished ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
            {MESI[currentMonth]} {currentYear} — {isPublished ? "Pubblicato" : "Bozza"}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.label}
              className={`bg-gradient-to-br ${card.color} rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:shadow-xl transition-shadow duration-300`}
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-8 translate-x-8 group-hover:scale-125 transition-transform duration-500" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-bold uppercase tracking-widest ${card.textColor} opacity-80`}>
                    {card.label}
                  </span>
                  <Icon size={20} className={`${card.textColor} opacity-60`} />
                </div>
                <p className={`text-4xl font-black ${card.textColor} tracking-tight`}>{card.value}</p>
                <p className={`text-[11px] mt-2 ${card.textColor} opacity-70 font-medium`}>{card.sub}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <TrendingUp size={20} className="text-blue-500" />
          Accesso Rapido
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { label: "Pianificazione Mensile", desc: "Griglia Turni & Reperibilità", href: "/admin/pianificazione", icon: CalendarDays, accent: "blue" },
            { label: "Ordine di Servizio", desc: "Assegnazione Giornaliera", href: "/admin/ods", icon: Shield, accent: "emerald" },
            { label: "Generatore Ciclico", desc: "Auto-Compilazione Turni", href: "/admin/auto-compila", icon: Clock, accent: "violet" },
          ].map((action) => {
            const Icon = action.icon
            return (
              <Link
                key={action.href}
                href={action.href}
                className={`group flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:border-${action.accent}-300 hover:shadow-md transition-all duration-200`}
              >
                <div className={`w-11 h-11 bg-${action.accent}-50 rounded-xl flex items-center justify-center group-hover:bg-${action.accent}-100 transition-colors shrink-0`}>
                  <Icon size={20} className={`text-${action.accent}-500`} />
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-800 block">{action.label}</span>
                  <span className="text-xs text-slate-400 font-medium">{action.desc}</span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Pattuglie / Cockpit Operativo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Colonna Operativa */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Shield size={24} className="text-emerald-500" />
            Pattuglie e Servizi Assegnati
          </h2>

          {operativiOggi === 0 ? (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center">
               <p className="text-slate-400 font-bold uppercase tracking-widest">Nessuna unità operativa in servizio</p>
            </div>
          ) : (
            // Raggruppiamo i turni operativi per Categoria, poi per orari/tipo.
            (() => {
              const opShifts = todayShifts.filter(s => !isAssenza(s.type))
              const categories = [...new Set(opShifts.map(s => s.serviceCategory?.name || "Servizio Generico"))]
              
              return categories.map(cat => (
                <div key={cat} className="space-y-3">
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest border-b-2 border-slate-100 pb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    {cat}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Le pattuglie in questa categoria raggruppate per orario/veicolo/servizio */}
                    {(() => {
                      const shiftsInCat = opShifts.filter(s => (s.serviceCategory?.name || "Servizio Generico") === cat)
                      
                      // Raggruppa per un mix di parametri per simulare l'entità "Pattuglia".
                      // Se manca un patrolGroupId, useremo type+cat+vehc
                      const grouped: Record<string, typeof shiftsInCat> = {}
                      shiftsInCat.forEach(s => {
                         const gId = s.patrolGroupId || `${s.type}-${s.serviceType?.name || 'Base'}-${s.vehicle?.name || 'N/A'}`
                         if (!grouped[gId]) grouped[gId] = []
                         grouped[gId].push(s)
                      })

                      return Object.values(grouped).map((group, idx) => (
                        <div key={idx} className="bg-white border-2 border-slate-100 hover:border-emerald-200 rounded-2xl p-4 shadow-sm transition-all hover:shadow-md">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                               <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 font-black text-[10px] uppercase rounded mb-1">{group[0].type}</span>
                               <h4 className="font-bold text-slate-800 leading-tight block">{group[0].serviceType?.name || "Pattugliamento"}</h4>
                               {group[0].timeRange && <p className="text-xs text-slate-500 font-bold mt-0.5">{group[0].timeRange}</p>}
                            </div>
                            {group[0].vehicle && (
                               <div className="flex items-center gap-1.5 bg-slate-800 text-slate-100 px-2.5 py-1 rounded-lg text-xs font-black shadow-sm">
                                  <CarFront size={14} className="opacity-80" />
                                  {group[0].vehicle.name}
                               </div>
                            )}
                          </div>
                          
                          <div className="space-y-1.5 pt-2 border-t border-slate-50">
                             {group.map(member => (
                                <div key={member.userId} className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                   {member.user.isUfficiale && <span className="text-[9px] bg-blue-100 text-blue-700 px-1 rounded font-black">UFF</span>}
                                   {member.user.name}
                                   {member.repType && <span className="ml-auto text-[9px] font-black text-violet-600 bg-violet-100 px-1.5 py-0.5 rounded uppercase">Eredità {member.repType}</span>}
                                </div>
                             ))}
                          </div>
                        </div>
                      ))
                    })()}
                  </div>
                </div>
              ))
            })()
          )}
        </div>

        {/* Colonna Eccezioni */}
        <div className="space-y-6">
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <AlertTriangle size={24} className="text-amber-500" />
            Eccezioni & Gestione
          </h2>
          
          <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-5">
             <h3 className="font-bold text-amber-900 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
               Assenti (<span className="text-rose-600">{assentiOggi}</span>)
             </h3>
             {assentiOggi === 0 ? (
               <p className="text-amber-700/60 text-sm font-medium italic">Nessun dipendente assente oggi.</p>
             ) : (
               <div className="space-y-2">
                 {todayShifts.filter(s => isAssenza(s.type)).map(s => (
                   <div key={s.userId} className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-amber-50 shadow-sm">
                      <span className="font-bold text-slate-700 text-sm">{s.user.name}</span>
                      <span className="text-[10px] font-black uppercase px-2 py-1 bg-amber-100 text-amber-800 rounded">
                        {isMalattia(s.type) ? <span className="text-rose-600">MALATTIA</span> : s.type}
                      </span>
                   </div>
                 ))}
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  )
}
