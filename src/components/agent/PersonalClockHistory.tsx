"use client"

import { useState, useEffect } from "react"
import { Clock, Calendar, LogIn, LogOut, CheckCircle2, ChevronRight, Activity, CalendarDays } from "lucide-react"

export default function PersonalClockHistory({ 
  onViewHistory, 
  records = [], 
  loading = false 
}: { 
  onViewHistory?: () => void,
  records?: any[],
  loading?: boolean
}) {
  const groupedByDay = records.reduce((acc: any, r: any) => {
    const d = new Date(r.timestamp).toLocaleDateString('it-IT')
    if (!acc[d]) acc[d] = []
    acc[d].push(r)
    return acc
  }, {})

  // Prendi solo gli ultimi 2 giorni che hanno record
  const last2Days = Object.keys(groupedByDay)
    .sort((a, b) => {
      const [da, ma, ya] = a.split('/').map(Number)
      const [db, mb, yb] = b.split('/').map(Number)
      return new Date(yb, mb - 1, db).getTime() - new Date(ya, ma - 1, da).getTime()
    })
    .slice(0, 2)

  return (
    <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-purple-100 rounded-2xl">
            <Clock size={24} className="text-purple-600" />
          </div>
          <div>
            <h3 className="font-black text-xl text-slate-900">Ultime Timbrature</h3>
            <p className="text-xs text-slate-500 font-medium tracking-tight">Attività degli ultimi 2 giorni</p>
          </div>
        </div>

        {onViewHistory && (
          <button 
            onClick={onViewHistory}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
          >
            <CalendarDays size={14} className="text-purple-500" />
            Storico Completo
          </button>
        )}
      </div>

      <div className="p-4 sm:p-6 bg-slate-50/30">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Activity className="w-8 h-8 text-slate-300 animate-spin mb-4" />
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Caricamento...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex p-4 rounded-full bg-slate-100 mb-4">
              <CalendarDays className="w-8 h-8 text-slate-300" />
            </div>
            <h4 className="text-sm font-black text-slate-500 uppercase tracking-widest">Nessuna Registrazione</h4>
            <p className="text-xs text-slate-400 mt-2">Effettua la tua prima timbratura per vederla qui.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {last2Days.map(date => {
              const dayRecords = groupedByDay[date]
              return (
                <div key={date} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-50">
                    <span className="text-sm font-black text-slate-800 flex items-center gap-2">
                       <Calendar size={14} className="text-slate-400" /> {date}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                       {dayRecords.length} Eventi
                    </span>
                  </div>

                  <div className="space-y-3">
                    {dayRecords.map((r: any) => {
                      const isEnter = r.type === "SCENDI_IN_STRADA" || r.type === "INIZIO_TURNO"
                      return (
                        <div key={r.id} className="flex items-center justify-between p-3 rounded-[1rem] bg-slate-50 border border-slate-100 hover:border-slate-300 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${isEnter ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                              {isEnter ? <LogIn size={18} /> : <LogOut size={18} />}
                            </div>
                            <div>
                               <p className="text-sm font-black text-slate-800">{new Date(r.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</p>
                               <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{isEnter ? "Entrata" : "Uscita"}</p>
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end gap-1">
                            {r.isVerified ? (
                              <span className="flex items-center gap-1 text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-widest">
                                <CheckCircle2 size={10} /> GPS OK
                              </span>
                            ) : (
                              <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full uppercase tracking-widest">
                                MANUALE
                              </span>
                            )}
                            <ChevronRight size={14} className="text-slate-300" />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
