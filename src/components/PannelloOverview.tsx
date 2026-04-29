"use client"

import { useState, useEffect } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { getLabel } from "@/utils/agenda-codes"
import {
  Shield,
  AlertTriangle,
  CalendarDays,
  Activity,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  CarFront,
  Wand2,
  Utensils
} from "lucide-react"
import Link from "next/link"
import { isAssenza, isMalattia } from "@/utils/shift-logic"
import OnboardingWizard from "./OnboardingWizard"

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
  tenantSlug: string
  tenantName: string
  totalScadenze?: number
}

const MESI = ["", "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"]

export default function PannelloOverview({ totalAgents, todayShifts, isPublished, currentMonth, currentYear, settings, totalVehicles, pendingSwaps, tenantSlug, tenantName, totalScadenze = 0 }: PannelloOverviewProps) {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [collapsedPattuglie, setCollapsedPattuglie] = useState(false)
  const [collapsedEccezioni, setCollapsedEccezioni] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(totalAgents === 0)

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

  const coperturaPercent = totalAgents > 0 ? Math.round((operativiOggi / totalAgents) * 100) : 0
  
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
      {/* Onboarding Wizard for empty tenants */}
      {showOnboarding && (
        <OnboardingWizard
          tenantSlug={tenantSlug}
          tenantName={tenantName}
          onComplete={() => { setShowOnboarding(false); window.location.reload() }}
        />
      )}

      {/* Page Header Premium */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-10">
        <div className="animate-in slide-in-from-left duration-700">
          <div className="flex items-center gap-3 mb-2">
             <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                <Activity width={18} height={18} />
             </div>
             <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Sentinel Command Dashboard</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">Pannello <span className="text-blue-600">Overview</span></h1>
          <p className="text-sm text-slate-500 mt-4 font-bold flex items-center gap-3">
             <span className="bg-slate-100 px-3 py-1 rounded-lg text-slate-700">
               {currentTime.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}
             </span>
             <span className="w-1.5 h-1.5 bg-slate-200 rounded-full"></span>
             <span className="text-slate-500 font-black tracking-widest">{currentTime.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}</span>
          </p>
        </div>

        <div className="flex items-center gap-4 animate-in slide-in-from-right duration-700">
          <div className={`flex items-center gap-3 px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border shadow-xl transition-all ${isPublished ? "bg-emerald-500 text-white border-emerald-400 shadow-emerald-200" : "bg-white text-amber-600 border-amber-200 shadow-amber-50"}`}>
            {isPublished ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} className="animate-pulse" />}
            {MESI[currentMonth]} {currentYear} — {isPublished ? "Stato: Pubblicato" : "Stato: In Bozza"}
          </div>
        </div>
      </div>

      {/* KPI Cards Premium Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, idx) => {
          const Icon = card.icon
          return (
            <div
              key={card.label}
              style={{ animationDelay: `${idx * 100}ms` }}
              className={`relative overflow-hidden bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-sm border border-slate-100 group hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 animate-in zoom-in-95 mx-2 sm:mx-0`}
            >
              {/* Decorative Background Blob */}
              <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full blur-[40px] opacity-10 group-hover:opacity-20 transition-opacity bg-gradient-to-br ${card.color}`} />
              
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-center justify-between mb-8">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${card.color} flex items-center justify-center text-white shadow-xl shadow-slate-200 group-hover:scale-110 transition-transform duration-500`}>
                    <Icon size={24} />
                  </div>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] group-hover:text-slate-700 transition-colors">Sentinel Kpi 0{idx+1}</span>
                </div>
                
                <div className="mb-2">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{card.label}</p>
                   <p className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tighter leading-none">{card.value}</p>
                </div>
                
                <div className="mt-8 pt-4 border-t border-slate-50 flex items-center justify-between">
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight truncate pr-2">{card.sub}</span>
                   <div className="flex gap-1">
                      <div className="w-1 h-1 bg-slate-200 rounded-full"></div>
                      <div className="w-1 h-1 bg-slate-200 rounded-full"></div>
                      <div className="w-1 h-4 bg-slate-200 rounded-full"></div>
                   </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Premium Quick Actions */}
      <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300">
        <h2 className="text-[12px] font-black text-slate-400 mb-6 flex items-center gap-3 uppercase tracking-[0.2em]">
          <TrendingUp size={18} className="text-blue-500" />
          Protocolli di Accesso Rapido
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 px-2 sm:px-0">
          {[
            { label: "Pianificazione Mensile", desc: "Griglia Turni & Reperibilità", href: `/${tenantSlug}/admin/pianificazione`, icon: CalendarDays, accent: "blue", shadow: "shadow-blue-50" },
            { label: "Ordine di Servizio", desc: "Assegnazione Giornaliera", href: `/${tenantSlug}/admin/ods`, icon: Shield, accent: "indigo", shadow: "shadow-indigo-50" },
            { label: "Modulo Buoni Pasto", desc: "Calcolo Maturazioni & Export", href: `/${tenantSlug}/admin/buoni-pasto`, icon: Utensils, accent: "emerald", shadow: "shadow-emerald-50" },
          ].map((action) => {
            const Icon = action.icon
            return (
              <Link
                key={action.href}
                href={action.href}
                className={`group relative flex items-center gap-6 p-8 bg-white rounded-[2rem] border border-slate-100 hover:border-${action.accent}-500 hover:shadow-2xl transition-all duration-500 overflow-hidden`}
              >
                <div className={`absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700`}>
                   <Icon size={120} />
                </div>
                <div className={`w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-all duration-500 shrink-0 shadow-inner`}>
                  <Icon size={24} />
                </div>
                <div className="relative z-10">
                  <span className="text-sm font-black text-slate-900 block uppercase tracking-tight mb-1">{action.label}</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest opacity-70">{action.desc}</span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* KPI Strategici Comandante Premium */}
      <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 delay-500">
        <h2 className="text-[12px] font-black text-slate-400 mb-6 flex items-center gap-3 uppercase tracking-[0.2em]">
          <Activity size={18} className="text-indigo-500" />
          Scanner Strategico Forze
        </h2>
        <div className="bg-slate-900 rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center gap-12 border border-slate-800 mx-2 sm:mx-0">
           <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(79,70,229,0.1),transparent)] pointer-events-none"></div>
           
           <div className="flex-1 w-full relative z-10">
              <div className="flex justify-between items-end mb-4">
                 <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Tasso di Copertura Effettivo</p>
                    <h3 className="text-3xl sm:text-5xl font-black text-white tracking-tighter leading-none">{coperturaPercent}%</h3>
                 </div>
                 <span className={`text-[10px] font-black px-4 py-2 rounded-xl uppercase tracking-widest border transition-all duration-500 ${coperturaPercent >= 80 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : coperturaPercent >= 50 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                    {coperturaPercent >= 80 ? 'Status Ottimale' : coperturaPercent >= 50 ? 'Status Accettabile' : 'Status Critico'}
                 </span>
              </div>
              <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden shadow-inner border border-white/10 p-1">
                 <div className={`h-full rounded-full transition-all duration-1000 shadow-[0_0_20px_rgba(0,0,0,0.5)] ${coperturaPercent >= 80 ? 'bg-emerald-500' : coperturaPercent >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${coperturaPercent}%` }}></div>
              </div>
           </div>

           <div className="hidden md:block w-px h-24 bg-white/10 relative z-10"></div>

           <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 relative z-10">
              <div className="bg-white/5 p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 backdrop-blur-md group hover:bg-white/10 transition-colors">
                 <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Squadre Formate</p>
                 <div className="flex items-end gap-3">
                    <p className="text-2xl sm:text-4xl font-black text-white leading-none">
                       {new Set(todayShifts.filter(s => s.patrolGroupId).map(s => s.patrolGroupId)).size}
                    </p>
                    <span className="text-[10px] font-bold text-slate-500 uppercase mb-1">Unità</span>
                 </div>
              </div>
              <div className="bg-white/5 p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 backdrop-blur-md group hover:bg-white/10 transition-colors">
                 <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Status Ufficiali</p>
                 <div className="flex items-end gap-3">
                    <p className={`text-2xl sm:text-4xl font-black leading-none ${ufficialiStatusOk ? 'text-emerald-400' : 'text-rose-400'}`}>
                       {ufficialiOggi}
                    </p>
                    <span className="text-slate-500 text-[10px] font-black mb-1">/ {targetUfficiali}</span>
                 </div>
              </div>
              <div className="bg-white/5 p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 backdrop-blur-md group hover:bg-white/10 transition-colors">
                 <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Scadenze 30gg</p>
                 <div className="flex items-end gap-3">
                    <p className={`text-2xl sm:text-4xl font-black leading-none ${totalScadenze > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                       {totalScadenze}
                    </p>
                    <span className="text-slate-500 text-[10px] font-black mb-1">Alerts</span>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Sentinel AI Insights Premium */}
      <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 delay-600">
        <h2 className="text-[12px] font-black text-slate-400 mb-6 flex items-center gap-3 uppercase tracking-[0.2em]">
          <Wand2 size={18} className="text-purple-500" />
          Sentinel AI Intelligence Insights
        </h2>
        <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 shadow-2xl relative overflow-hidden border border-white/10 group mx-2 sm:mx-0">
           <div className="absolute top-0 right-0 w-1/2 h-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.15),transparent)] pointer-events-none group-hover:scale-110 transition-transform duration-1000"></div>
           
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 relative z-10">
              {/* Analisi Copertura */}
              <div className="space-y-4">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center text-indigo-400 border border-white/10">
                       <Shield size={20} />
                    </div>
                    <h4 className="text-xs font-black text-white uppercase tracking-widest">Rating Sicurezza</h4>
                 </div>
                 <p className="text-3xl font-black text-white tracking-tighter italic">
                    {ufficialiStatusOk ? "Massima Operatività" : "Attenzione Requisiti"}
                 </p>
                 <p className="text-slate-400 text-[11px] leading-relaxed font-medium">
                    {ufficialiStatusOk 
                      ? "La presenza degli ufficiali garantisce la piena capacità decisionale e legale per tutti gli interventi esterni."
                      : `Il comando opera attualmente sotto il target minimo di ${targetUfficiali} ufficiali. Valutare il richiamo in servizio.`}
                 </p>
              </div>

              {/* Efficienza Mezzi */}
              <div className="space-y-4">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center text-emerald-400 border border-white/10">
                       <CarFront size={20} />
                    </div>
                    <h4 className="text-xs font-black text-white uppercase tracking-widest">Efficienza Autoparco</h4>
                 </div>
                 <p className="text-3xl font-black text-white tracking-tighter italic">
                    {veicoliInUsoCount > totalVehicles * 0.8 ? "Impiego Intensivo" : "Disponibilità Ottimale"}
                 </p>
                 <p className="text-slate-400 text-[11px] leading-relaxed font-medium">
                    {veicoliInUsoCount > totalVehicles * 0.8
                      ? "Elevato carico sui veicoli del comando. Si consiglia di monitorare le scadenze manutentive e i livelli di carburante."
                      : "Il parco auto presenta un'ottima rotazione. Veicoli di riserva pronti per eventuali emergenze o guasti improvvisi."}
                 </p>
              </div>

              {/* Rischio Operativo */}
              <div className="space-y-4">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center text-rose-400 border border-white/10">
                       <AlertTriangle size={20} />
                    </div>
                    <h4 className="text-xs font-black text-white uppercase tracking-widest">Indice di Rischio</h4>
                 </div>
                 <p className="text-3xl font-black text-white tracking-tighter italic">
                    {assentiOggi > totalAgents * 0.3 ? "Rischio Critico" : (assentiOggi > 0 ? "Rischio Controllato" : "Rischio Minimo")}
                 </p>
                 <p className="text-slate-400 text-[11px] leading-relaxed font-medium">
                    {assentiOggi > totalAgents * 0.3
                      ? "L'alto tasso di assenza mette a dura prova la pianificazione. Valutare lo stato di allerta e la priorità degli interventi."
                      : (assentiOggi > 0 ? "Assenze gestite correttamente tramite la bacheca scambi e le rotazioni pianificate." : "Forza lavoro al completo. Condizione ideale per attività di controllo massivo sul territorio.")}
                 </p>
              </div>
           </div>

           {/* Footer AI Branding */}
           <div className="mt-12 pt-8 border-t border-white/10 flex items-center justify-between opacity-50">
              <div className="flex items-center gap-2">
                 <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></div>
                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Sentinel AI Engine v2.0 Active</span>
              </div>
              <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Analisi generata in tempo reale basata sui KPI correnti</span>
           </div>
        </div>
      </div>

      {/* Operational Cockpit & Exceptions Premium */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-700">
        
        {/* Colonna Operativa */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center justify-between group cursor-pointer" onClick={() => setCollapsedPattuglie(!collapsedPattuglie)}>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-600">
                 <Shield size={24} />
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Cockpit Operativo</h2>
            </div>
            <div className="w-10 h-10 bg-slate-50 flex items-center justify-center rounded-xl text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all duration-300">
               {collapsedPattuglie ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
            </div>
          </div>          <div className="space-y-10">
            {/* 1. SEZIONE REPERIBILITÀ (Sempre visibile se ci sono persone) */}
            {(() => {
              const repOnly = todayShifts.filter(s => s.repType && (s.repType.toLowerCase().includes("rep")));
              if (repOnly.length === 0) return null;
              
              return (
                <div className="space-y-6 pb-6 border-b border-slate-100">
                  <div className="flex items-center gap-4 px-2">
                     <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.5)] animate-pulse"></div>
                     <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Personale in Reperibilità</h3>
                     <div className="flex-1 h-px bg-gradient-to-r from-slate-100 to-transparent"></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                     {repOnly.map(s => (
                       <div key={s.userId} className="bg-amber-50/30 border border-amber-100 rounded-[2rem] p-6 shadow-sm flex items-center justify-between group hover:bg-white hover:border-amber-400 transition-all duration-300">
                          <div className="flex items-center gap-4">
                             <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${s.user.isUfficiale ? 'bg-amber-600 text-white shadow-lg' : 'bg-amber-100 text-amber-700'}`}>
                                {s.user.name.split(' ').map(n => n[0]).join('').slice(0,2)}
                             </div>
                             <div>
                                <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{s.user.name}</p>
                                <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest leading-none mt-1">Stato: Reperibile ({s.repType})</p>
                             </div>
                          </div>
                       </div>
                     ))}
                  </div>
                </div>
              )
            })()}

            {/* 2. COCKPIT OPERATIVO (Pattuglie) */}
            {operativiOggi === 0 ? (
              <div className="bg-white border-2 border-dashed border-slate-100 rounded-[3rem] p-16 text-center shadow-inner">
                 <Activity className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                 <p className="text-slate-400 font-extrabold uppercase tracking-[0.2em] text-xs">Soggiorno Operativo Vacante</p>
                 <p className="text-[10px] text-slate-300 font-black uppercase mt-2">Nessuna unità rilevata nei registri odierni</p>
              </div>
            ) : (
              (() => {
                const opShifts = todayShifts.filter(s => !isAssenza(s.type))
                const categories = [...new Set(opShifts.map(s => s.serviceCategory?.name || "Servizio Generico"))]
                
                return (
                  <div className="space-y-12">
                    {categories.map(cat => (
                      <div key={cat} className="space-y-6">
                         <div className="flex items-center gap-4 px-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] font-outfit">{cat}</h3>
                            <div className="flex-1 h-px bg-gradient-to-r from-slate-100 to-transparent"></div>
                         </div>
                         
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                           {(() => {
                             const shiftsInCat = opShifts.filter(s => (s.serviceCategory?.name || "Servizio Generico") === cat)
                             const grouped: Record<string, typeof shiftsInCat> = {}
                             shiftsInCat.forEach(s => {
                                const gId = s.patrolGroupId || `${s.type}-${s.serviceType?.name || 'Base'}-${s.vehicle?.name || 'N/A'}`
                                if (!grouped[gId]) grouped[gId] = []
                                grouped[gId].push(s)
                             })

                             return Object.values(grouped).map((group, idx) => (
                               <div key={idx} className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm hover:shadow-2xl hover:border-emerald-200 transition-all duration-500 group/card">
                                 <div className="flex justify-between items-start mb-6">
                                   <div>
                                      <div className="flex items-center gap-2 mb-2">
                                         <span className="px-3 py-1 bg-slate-900 text-white font-black text-[9px] uppercase rounded-lg tracking-widest">{group[0].type}</span>
                                         {group[0].timeRange && <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{group[0].timeRange}</span>}
                                      </div>
                                      <h4 className="font-black text-slate-900 text-lg uppercase tracking-tight leading-tight">{group[0].serviceType?.name || "Pattugliamento"}</h4>
                                   </div>
                                   {group[0].vehicle && (
                                      <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-2xl text-[10px] font-black border border-blue-100 shadow-sm group-hover/card:bg-blue-600 group-hover/card:text-white transition-colors duration-500">
                                         <CarFront size={14} />
                                         {group[0].vehicle.name}
                                      </div>
                                   )}
                                 </div>
                                 
                                 <div className="space-y-4 pt-6 border-t border-slate-50">
                                    {group.map(member => (
                                       <div key={member.userId} className="flex items-center justify-between group/row">
                                          <div className="flex items-center gap-4">
                                             <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-[10px] ${member.user.isUfficiale ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-100 text-slate-500'}`}>
                                                {member.user.name.split(' ').map(n => n[0]).join('').slice(0,2)}
                                             </div>
                                             <div>
                                                <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{member.user.name}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{member.user.qualifica || 'Operatore'}</p>
                                             </div>
                                          </div>
                                          {member.repType && (
                                             <div className="px-3 py-1 bg-amber-50 text-amber-700 text-[8px] font-black rounded-lg border border-amber-100 uppercase animate-pulse">
                                                Rep. {member.repType}
                                             </div>
                                          )}
                                       </div>
                                    ))}
                                 </div>
                               </div>
                             ))
                           })()}
                         </div>
                      </div>
                    ))}
                  </div>
                )
              })()
            )}
           </div>
        </div>

        {/* Colonna Eccezioni */}
        <div className="space-y-8">
          <div className="flex items-center justify-between group cursor-pointer" onClick={() => setCollapsedEccezioni(!collapsedEccezioni)}>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-600">
                 <AlertTriangle size={24} />
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Eccezioni</h2>
            </div>
            <div className="w-10 h-10 bg-slate-50 flex items-center justify-center rounded-xl text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all duration-300">
               {collapsedEccezioni ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
            </div>
          </div>
          
          {!collapsedEccezioni && (
            <div className="bg-white border border-slate-100 rounded-[3rem] p-8 shadow-sm">
               <div className="flex items-center justify-between mb-8 px-2">
                  <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Assenze Cloud</h3>
                  <span className="bg-rose-500 text-white px-3 py-1 rounded-full text-[10px] font-black shadow-lg shadow-rose-200">{assentiOggi}</span>
               </div>
               
               {assentiOggi === 0 ? (
                 <div className="py-12 text-center bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-100">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nessuna Defezione</p>
                 </div>
               ) : (
                 <div className="space-y-4">
                   {todayShifts.filter(s => isAssenza(s.type)).map(s => (
                     <div key={s.userId} className="flex items-center gap-4 bg-slate-50 p-5 rounded-[1.8rem] border border-slate-100 hover:bg-white hover:shadow-xl hover:scale-105 transition-all duration-300">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-xs shadow-lg ${isMalattia(s.type) ? 'bg-rose-600 shadow-rose-100' : 'bg-amber-500 shadow-amber-100'}`}>
                           {s.user.name[0]}
                        </div>
                        <div className="flex-1">
                           <p className="text-sm font-black text-slate-800 uppercase leading-snug">{s.user.name}</p>
                           <p className={`text-[9px] font-black uppercase tracking-wider ${isMalattia(s.type) ? 'text-rose-600' : 'text-amber-600'}`}>
                              {isMalattia(s.type) ? 'Stato: Malattia' : `Stato: ${getLabel(s.type)} (${s.type})`}
                           </p>
                        </div>
                     </div>
                   ))}
                 </div>
               )}
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
