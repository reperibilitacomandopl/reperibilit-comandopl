"use client"

import { useState, useEffect } from "react"
import { Calendar, RefreshCw, Compass, AlertCircle, Sun, Snowflake, Star } from "lucide-react"
import toast from "react-hot-toast"

export default function AgentRotationView() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [season, setSeason] = useState<"SUMMER" | "WINTER">("SUMMER")
  const [respondingPlanId, setRespondingPlanId] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/agent/vacations/rotation")
      .then(res => res.json())
      .then(d => {
        setData(d)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  const handleAcceptPlan = async (planId: string) => {
    setRespondingPlanId(planId)
    try {
      const res = await fetch("/api/agent/vacations/rotation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, action: "ACCEPT" })
      })
      const d = await res.json()
      if (res.ok) {
        toast.success("Periodo ferie accettato con successo!")
        setData((prev: any) => {
          if (!prev) return prev
          return {
            ...prev,
            activePlans: prev.activePlans.map((p: any) => 
              p.id === planId ? { ...p, status: "CONFIRMED" } : p
            )
          }
        })
      } else {
        toast.error(d.error || "Errore durante l'accettazione")
      }
    } catch (err) {
      toast.error("Errore di rete")
    } finally {
      setRespondingPlanId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800/80 shadow-sm">
        <RefreshCw className="animate-spin text-indigo-500 mb-2" size={24} />
        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Caricamento turni rotazione...</span>
      </div>
    )
  }

  const vacations = data?.vacations || []
  const holidays = data?.holidays || []
  const activePlans = data?.activePlans || []

  const activeVacationGroup = vacations.find((v: any) => v.season === season)
  const currentYear = new Date().getFullYear()
  const currentSeasonPlan = activePlans.find((p: any) => p.period === season && p.year === currentYear)

  return (
    <div className="space-y-6">
      
      {/* Introduction Card */}
      <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-[2rem] p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-8 -mt-8"></div>
        <div className="relative z-10 space-y-2">
          <span className="text-[10px] bg-indigo-500/30 border border-indigo-500/30 text-indigo-200 px-3 py-1 rounded-full font-black uppercase tracking-widest">
            Trasparenza & Equità
          </span>
          <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <Compass className="text-indigo-400" size={22} /> I Tuoi Turni di Rotazione
          </h3>
          <p className="text-slate-350 text-xs font-semibold leading-relaxed">
            Visualizza in anticipo la pianificazione automatica delle tue ferie e dei turni festivi per quest'anno e i successivi.
          </p>
        </div>
      </div>

      {currentSeasonPlan && (
        <div className={`p-6 rounded-[2rem] border shadow-sm transition-all duration-300 ${
          currentSeasonPlan.status === "ASSIGNED" 
            ? "bg-amber-50/50 dark:bg-amber-950/10 border-amber-250 dark:border-amber-900/40 animate-pulse-slow" 
            : "bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-250 dark:border-emerald-900/40"
        }`}>
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-2xl ${
              currentSeasonPlan.status === "ASSIGNED" ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-650"
            }`}>
              <Calendar size={24} />
            </div>
            <div className="flex-1 space-y-2">
              <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                currentSeasonPlan.status === "ASSIGNED" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
              }`}>
                {currentSeasonPlan.status === "ASSIGNED" ? "Da Accettare" : "Confermato"}
              </span>
              <h4 className="text-base font-black text-slate-900 dark:text-white">
                {currentSeasonPlan.status === "ASSIGNED" ? "Periodo Ferie Assegnato d'Ufficio" : "Il Tuo Periodo Ferie Confermato"}
              </h4>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Dal {new Date(currentSeasonPlan.startDate).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })} al {new Date(currentSeasonPlan.endDate).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </p>
              
              {currentSeasonPlan.status === "ASSIGNED" && (
                <div className="space-y-4 pt-2">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                    Questo periodo ti è stato assegnato d'ufficio per la rotazione di quest'anno. Per inserirlo definitivamente nel tuo calendario, clicca su "Accetta". In alternativa, puoi richiederne lo scambio con un collega o fare richiesta per un altro periodo.
                  </p>
                  <div className="flex flex-wrap gap-2.5">
                    <button
                      disabled={respondingPlanId === currentSeasonPlan.id}
                      onClick={() => handleAcceptPlan(currentSeasonPlan.id)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/10 active:scale-95"
                    >
                      {respondingPlanId === currentSeasonPlan.id ? "Accettazione..." : "Accetta Periodo"}
                    </button>
                    <button
                      onClick={() => alert("Per scambiare questo turno di ferie, vai alla scheda 'Scambio Turni' e crea una proposta di scambio per questo periodo.")}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-355 rounded-xl text-xs font-bold transition-all active:scale-95"
                    >
                      Scambia con Collega
                    </button>
                    <button
                      onClick={() => alert("Per richiedere un altro periodo, usa il tasto 'Richiesta Congedi' nella pagina principale per presentare una preferenza alternativa.")}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-355 rounded-xl text-xs font-bold transition-all active:scale-95"
                    >
                      Richiedi Altro Periodo
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* 1. VACATION ROUND-ROBIN SECTION */}
        <div className="bg-white dark:bg-slate-950 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-850 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-3">
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
              {season === "SUMMER" ? <Sun size={14} className="text-amber-500" /> : <Snowflake size={14} className="text-blue-500" />}
              Turni Ferie Rotazione
            </h4>

            {/* Summer/Winter Selector */}
            <div className="flex bg-slate-50 dark:bg-slate-900 border border-slate-200/50 p-0.5 rounded-lg">
              <button
                onClick={() => setSeason("SUMMER")}
                className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider transition-all ${
                  season === "SUMMER" ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm" : "text-slate-400"
                }`}
              >
                Sole
              </button>
              <button
                onClick={() => setSeason("WINTER")}
                className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider transition-all ${
                  season === "WINTER" ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm" : "text-slate-400"
                }`}
              >
                Neve
              </button>
            </div>
          </div>

          {!activeVacationGroup ? (
            <div className="py-8 text-center text-slate-400">
              <AlertCircle className="mx-auto mb-2 text-slate-300" size={24} />
              <p className="text-xs font-bold">Non appartieni a nessun gruppo ferie per la stagione {season === "SUMMER" ? "Estate" : "Inverno"}</p>
              <p className="text-[10px] mt-0.5">Contatta l'ufficio verbali o il comandante per farti inserire in un gruppo.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Il Tuo Gruppo Ferie:</span>
                <p className="text-sm font-black text-slate-800 dark:text-white uppercase mt-0.5">{activeVacationGroup.groupName}</p>
              </div>

              <div className="space-y-2.5">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Calendario Assegnazioni Annuali:</span>
                {activeVacationGroup.schedule.map((sch: any) => (
                  <div key={sch.year} className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl transition-all hover:shadow-sm">
                    <span className="text-xs font-black text-slate-900 dark:text-white">{sch.year}</span>
                    <div className="text-right">
                      <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 block uppercase">{sch.periodName}</span>
                      <span className="text-[10px] text-slate-450 font-bold block mt-0.5">📅 {sch.dates}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 2. MIDWEEK HOLIDAY ROUND-ROBIN SECTION */}
        <div className="bg-white dark:bg-slate-950 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-850 shadow-sm space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-850 pb-3 flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
              <Star size={14} className="text-emerald-500 fill-emerald-500/25" />
              Festivi Infrasettimanali
            </h4>
          </div>

          {holidays.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              <AlertCircle className="mx-auto mb-2 text-slate-300" size={24} />
              <p className="text-xs font-bold">Non appartieni a nessun gruppo di rotazione festivi infrasettimanali</p>
              <p className="text-[10px] mt-0.5">La rotazione si applica a chi fa parte dei gruppi festivi gestiti dall'admin.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Il Tuo Gruppo Festivi:</span>
                <p className="text-sm font-black text-slate-800 dark:text-white uppercase mt-0.5">{holidays[0].groupName}</p>
              </div>

              <div className="space-y-3">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Giorni Assegnati per Anno:</span>
                {holidays[0].schedule.map((sch: any) => (
                  <div key={sch.year} className="space-y-1.5 p-3.5 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl">
                    <span className="text-xs font-black text-slate-900 dark:text-white block mb-2">Anno {sch.year}</span>
                    {sch.holidays.length === 0 ? (
                      <span className="text-[10px] text-slate-400 italic">Nessun festivo in questo anno (riposo totale)</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {sch.holidays.map((h: any, i: number) => (
                          <span key={i} className="text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 px-2.5 py-1 rounded-xl">
                            {h.name} ({h.date})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  )
}
