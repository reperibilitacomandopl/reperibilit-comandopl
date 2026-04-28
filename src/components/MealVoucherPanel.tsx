"use client"

import React, { useState, useEffect } from "react"
import { 
  Utensils, 
  Calendar, 
  Download, 
  Loader2, 
  ChevronLeft, 
  ChevronRight,
  Info,
  CheckCircle2,
  AlertTriangle,
  User,
  Search,
  FileSpreadsheet
} from "lucide-react"
import toast from "react-hot-toast"
import { format } from "date-fns"
import { it } from "date-fns/locale"

export default function MealVoucherPanel() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedAgent, setSelectedAgent] = useState<any>(null)

  const MESI = ["", "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"]

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/buoni-pasto?year=${year}&month=${month}`)
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setData(json)
    } catch (e) {
      toast.error("Errore nel caricamento dei Buoni Pasto")
      console.error(e)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [year, month])

  const filteredData = data.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.matricola.includes(searchTerm)
  )

  const exportToCSV = () => {
    const headers = ["Matricola", "Nome", "Conteggio Buoni Pasto", "Date"]
    const rows = data.map(a => [
      a.matricola,
      a.name,
      a.bpCount,
      a.bpDates.map((d: any) => d.date).join("; ")
    ])
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `Buoni_Pasto_${MESI[month]}_${year}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* Header Premium */}
      <div className="bg-slate-900 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-emerald-500 rounded-3xl shadow-xl shadow-emerald-500/20">
              <Utensils className="text-white" size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-white tracking-tight uppercase">Gestione <span className="text-emerald-400">Buoni Pasto</span></h2>
              <p className="text-emerald-300/60 font-black text-[10px] uppercase tracking-[0.3em]">Calcolo Automatico & Rendicontazione</p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-white/5 p-2 rounded-2xl border border-white/10 backdrop-blur-md">
            <button onClick={() => { if(month === 1) { setMonth(12); setYear(year-1) } else setMonth(month-1) }} className="p-2 text-white/50 hover:text-white transition-all"><ChevronLeft /></button>
            <span className="text-sm font-black text-white min-w-[140px] text-center uppercase tracking-widest">{MESI[month]} {year}</span>
            <button onClick={() => { if(month === 12) { setMonth(1); setYear(year+1) } else setMonth(month+1) }} className="p-2 text-white/50 hover:text-white transition-all"><ChevronRight /></button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text"
                  placeholder="Cerca agente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
                />
              </div>
              <button 
                onClick={exportToCSV}
                className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl"
              >
                <FileSpreadsheet size={16} />
                Esporta Report
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                    <th className="px-4 py-4">Agente</th>
                    <th className="px-4 py-4 text-center">Matricola</th>
                    <th className="px-4 py-4 text-center">Buoni Pasto</th>
                    <th className="px-4 py-4 text-right">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="py-20 text-center">
                        <Loader2 className="animate-spin text-emerald-500 mx-auto mb-4" size={32} />
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Elaborazione in corso...</p>
                      </td>
                    </tr>
                  ) : filteredData.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-20 text-center text-slate-400 italic">Nessun dato trovato</td>
                    </tr>
                  ) : filteredData.map(agent => (
                    <tr 
                      key={agent.id} 
                      className={`hover:bg-emerald-50/30 transition-colors group cursor-pointer ${selectedAgent?.id === agent.id ? 'bg-emerald-50' : ''}`}
                      onClick={() => setSelectedAgent(agent)}
                    >
                      <td className="px-4 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 font-black text-[10px] group-hover:bg-emerald-500 group-hover:text-white transition-all">
                            {agent.name.split(' ').map((n:any) => n[0]).join('').slice(0,2)}
                          </div>
                          <span className="text-sm font-black text-slate-800 uppercase tracking-tight">{agent.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-5 text-center text-xs font-bold text-slate-500">{agent.matricola}</td>
                      <td className="px-4 py-5 text-center">
                        <span className={`px-4 py-1 rounded-full font-black text-xs ${agent.bpCount > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                          {agent.bpCount}
                        </span>
                      </td>
                      <td className="px-4 py-5 text-right">
                        <button className="p-2 text-slate-300 hover:text-emerald-500 transition-colors"><Info size={18} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Detailed Side Panel */}
        <div className="space-y-6">
           <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm h-full min-h-[600px] flex flex-col">
              {selectedAgent ? (
                <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="flex items-center gap-4 mb-8">
                     <div className="p-4 bg-emerald-500 text-white rounded-3xl shadow-lg">
                        <User size={24} />
                     </div>
                     <div>
                        <h3 className="font-black text-slate-900 uppercase tracking-tight leading-none mb-1">{selectedAgent.name}</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Matr. {selectedAgent.matricola} • {MESI[month]}</p>
                     </div>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-6 mb-8 border border-slate-100">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Riepilogo Maturazione</p>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-4 rounded-xl border border-slate-100">
                           <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Totali</p>
                           <p className="text-2xl font-black text-slate-900">{selectedAgent.bpCount}</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-100">
                           <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Status</p>
                           <p className="text-xs font-black text-emerald-600 uppercase">Validati</p>
                        </div>
                     </div>
                  </div>

                  <div className="flex-1 space-y-3 overflow-auto max-h-[400px] pr-2 custom-scrollbar">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-2">Dettaglio Giornaliero</p>
                     {selectedAgent.bpDates.length === 0 ? (
                        <div className="text-center py-10 text-slate-300 italic text-xs uppercase font-bold tracking-widest">Nessun buono maturato</div>
                     ) : selectedAgent.bpDates.map((d: any, i: number) => (
                        <div key={i} className="flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-2xl group hover:border-emerald-200 transition-all">
                           <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex flex-col items-center justify-center border border-emerald-100 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                              <span className="text-[10px] font-black leading-none">{format(new Date(d.date), "dd")}</span>
                              <span className="text-[7px] font-bold uppercase">{format(new Date(d.date), "MMM", { locale: it })}</span>
                           </div>
                           <div className="flex-1">
                              <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight">{d.type === 'CONTINUOUS' ? 'Turno Continuato' : d.type === 'SPLIT' ? 'Turno Spezzato' : 'Validazione Totale'}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{d.details}</p>
                           </div>
                           <CheckCircle2 className="text-emerald-500 shrink-0" size={16} />
                        </div>
                     ))}
                  </div>

                  <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-3">
                     <Info className="text-blue-500 shrink-0 mt-0.5" size={16} />
                     <p className="text-[9px] font-bold text-blue-800 leading-relaxed uppercase">
                        I buoni pasto sono calcolati in base alle timbrature certificate e alle impostazioni globali del comando.
                     </p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-12 opacity-30">
                  <Utensils size={64} className="text-slate-200 mb-6" />
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-loose">
                    Seleziona un agente dalla lista<br />per visualizzare il dettaglio<br />delle maturazioni
                  </p>
                </div>
              )}
           </div>
        </div>

      </div>

    </div>
  )
}
