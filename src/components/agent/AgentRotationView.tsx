"use client"

import { useState, useEffect } from "react"
import { Calendar, RefreshCw, Compass, AlertCircle, Sun, Snowflake, Star } from "lucide-react"

export default function AgentRotationView() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [season, setSeason] = useState<"SUMMER" | "WINTER">("SUMMER")

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

  const activeVacationGroup = vacations.find((v: any) => v.season === season)

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
