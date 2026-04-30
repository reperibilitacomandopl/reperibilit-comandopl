"use client"

import React, { useState, useMemo } from "react"
import { X, Calendar, Clock, ChevronRight, LogIn, LogOut, FileText, Filter } from "lucide-react"

interface ClockRecord {
  id: string
  timestamp: string
  type: string
  isVerified: boolean
}

interface ClockHistoryModalProps {
  onClose: () => void
  records: ClockRecord[]
}

export default function ClockHistoryModal({ onClose, records }: ClockHistoryModalProps) {
  const [activeTab, setActiveTab] = useState<'days' | 'weeks' | 'months' | 'years'>('days')

  const getWeekNumber = (d: Date) => {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  const groupings = useMemo(() => {
    const days: Record<string, ClockRecord[]> = {}
    const weeks: Record<string, ClockRecord[]> = {}
    const months: Record<string, ClockRecord[]> = {}
    const years: Record<string, ClockRecord[]> = {}

    // Ordiniamo i record decrescenti prima di raggruppare
    const sortedRecords = [...records].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    sortedRecords.forEach(r => {
      const date = new Date(r.timestamp)
      
      // Days
      const dKey = date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
      if (!days[dKey]) days[dKey] = []
      days[dKey].push(r)

      // Weeks
      const week = getWeekNumber(date)
      const wKey = `Settimana ${week} (${date.getFullYear()})`
      if (!weeks[wKey]) weeks[wKey] = []
      weeks[wKey].push(r)

      // Months
      const mKey = date.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
      if (!months[mKey]) months[mKey] = []
      months[mKey].push(r)

      // Years
      const yKey = date.getFullYear().toString()
      if (!years[yKey]) years[yKey] = []
      years[yKey].push(r)
    })

    return { days, weeks, months, years }
  }, [records])

  const currentGroups = groupings[activeTab]

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl h-[90vh] sm:h-auto sm:max-h-[85vh] rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-500">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-600 rounded-2xl shadow-lg shadow-purple-200">
                 <Clock className="text-white" size={24} />
              </div>
              <div>
                 <h2 className="text-xl font-black text-slate-900">Storico Presenze</h2>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Resoconto dettagliato timbrature</p>
              </div>
           </div>
           <button 
             onClick={onClose}
             className="w-10 h-10 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 hover:text-rose-500 hover:border-rose-100 transition-all shadow-sm"
           >
             <X size={20} />
           </button>
        </div>

        {/* Tabs */}
        <div className="px-6 py-4 bg-white flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-slate-50 shrink-0">
           {(['days', 'weeks', 'months', 'years'] as const).map(tab => (
             <button
               key={tab}
               onClick={() => setActiveTab(tab)}
               className={`px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap
                 ${activeTab === tab ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}
               `}
             >
               {tab === 'days' ? 'Giorni' : tab === 'weeks' ? 'Settimane' : tab === 'months' ? 'Mesi' : 'Anni'}
             </button>
           ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/30">
           {Object.keys(currentGroups).length === 0 ? (
              <div className="py-20 text-center opacity-40">
                 <Filter size={48} className="mx-auto mb-4" />
                 <p className="font-black uppercase text-sm tracking-widest">Nessun dato trovato</p>
              </div>
           ) : (
             Object.keys(currentGroups).map(key => {
               const items = currentGroups[key]
               return (
                 <div key={key} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                       <h4 className="font-black text-slate-800 text-sm capitalize">{key}</h4>
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-slate-100 shadow-sm">
                          {items.length} eventi
                       </span>
                    </div>
                    <div className="p-4 space-y-2">
                       {items.map((r: ClockRecord, idx: number) => {
                         const date = new Date(r.timestamp)
                         const isEnter = r.type === "SCENDI_IN_STRADA" || r.type === "INIZIO_TURNO"
                         return (
                           <div key={r.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-2xl transition-colors">
                              <div className="flex items-center gap-4">
                                 <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isEnter ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                    {isEnter ? <LogIn size={14} /> : <LogOut size={14} />}
                                 </div>
                                 <div>
                                    <p className="text-xs font-black text-slate-800">
                                       {date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                                       {activeTab !== 'days' && <span className="text-slate-400 font-medium ml-2">({date.toLocaleDateString('it-IT')})</span>}
                                    </p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{isEnter ? "Entrata" : "Uscita"}</p>
                                 </div>
                              </div>
                              <div className="flex items-center gap-3">
                                 {r.isVerified ? (
                                   <span className="text-[8px] font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">GPS OK</span>
                                 ) : (
                                   <span className="text-[8px] font-black text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">MANUALE</span>
                                 )}
                                 <ChevronRight size={14} className="text-slate-200" />
                              </div>
                           </div>
                         )
                       })}
                    </div>
                 </div>
               )
             })
           )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-white flex items-center justify-between shrink-0">
           <div className="flex items-center gap-2">
              <FileText size={16} className="text-purple-500" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Totale Record: {records.length}</span>
           </div>
           <button 
             onClick={onClose}
             className="px-8 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:scale-105 active:scale-95 transition-all"
           >
             Chiudi
           </button>
        </div>
      </div>
    </div>
  )
}
