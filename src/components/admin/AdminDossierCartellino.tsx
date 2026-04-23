"use client"

import { useState, useEffect } from "react"
import { Activity, CalendarClock, Info, LogIn, LogOut, CheckCircle2, MessageCircleWarning } from "lucide-react"

export function AdminDossierCartellino({ userId, currentYear }: { userId: string, currentYear: number }) {
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/clock-records?userId=${userId}&limit=100`)
      .then(res => res.json())
      .then(data => {
        if (data.records) setRecords(data.records)
      })
      .finally(() => setLoading(false))
  }, [userId])

  const groupedByDay = records.reduce((acc: any, r: any) => {
    const d = new Date(r.timestamp).toLocaleDateString('it-IT')
    if (!acc[d]) acc[d] = []
    acc[d].push(r)
    return acc
  }, {})

  if (loading) return <div className="flex justify-center py-12"><Activity className="animate-spin text-indigo-400" size={24} /></div>

  if (records.length === 0) {
     return (
        <div className="text-center py-24 text-slate-400">
           <CalendarClock size={48} className="mx-auto mb-4 opacity-30" />
           <p className="font-bold uppercase tracking-widest text-sm">Nessuna timbratura registrata.</p>
        </div>
     )
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
       <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-start gap-4 mb-8">
          <Info className="text-indigo-500 shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="font-bold text-indigo-900 text-sm">Storico Timbrature Recenti</h4>
            <p className="text-xs text-indigo-700/70 mt-1 font-medium">Visualizzazione cronologica degli ultimi 100 eventi di Entrata e Uscita dell'agente. Utile per verifiche incrociate in caso di anomalie.</p>
          </div>
       </div>

       {Object.keys(groupedByDay).map(date => {
          const dayRecords = groupedByDay[date]
          return (
            <div key={date} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 sm:p-5 relative overflow-hidden group hover:border-slate-300 transition-colors">
               <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-50">
                  <span className="text-sm font-black text-slate-800 bg-slate-100 px-3 py-1 rounded-full">{date}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{dayRecords.length} Eventi</span>
               </div>
               <div className="space-y-3">
                  {dayRecords.map((r: any) => {
                     const isEnter = r.type === "SCENDI_IN_STRADA" || r.type === "INIZIO_TURNO"
                     return (
                        <div key={r.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200">
                           <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${isEnter ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                 {isEnter ? <LogIn size={18} /> : <LogOut size={18} />}
                              </div>
                              <div>
                                 <p className="text-lg font-black text-slate-900 leading-none">{new Date(r.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</p>
                                 <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">{isEnter ? "Entrata" : "Uscita"}</p>
                              </div>
                           </div>
                           <div className="text-right">
                              {r.isVerified ? (
                                 <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-700 bg-emerald-100 px-2 py-1 rounded-md uppercase tracking-widest">
                                    <CheckCircle2 size={12} /> Rilevato GPS
                                 </span>
                              ) : (
                                 <span className="inline-flex items-center gap-1 text-[9px] font-black text-amber-700 bg-amber-100 px-2 py-1 rounded-md uppercase tracking-widest">
                                    <MessageCircleWarning size={12} /> Mod. Manuale
                                 </span>
                              )}
                           </div>
                        </div>
                     )
                  })}
               </div>
            </div>
          )
       })}
    </div>
  )
}
