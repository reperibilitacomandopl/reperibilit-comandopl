"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Trash2, Clock, CalendarDays, Key, Info, ChevronLeft, ChevronRight, Loader2, AlertTriangle, User } from "lucide-react"
import toast from "react-hot-toast"

interface OvertimeEntry {
  id: string
  userId: string
  date: string
  code: string
  label: string
  hours: number
  note: string | null
  user: { name: string, matricola: string, isUfficiale?: boolean }
}

export default function OvertimePanel() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState<OvertimeEntry[]>([])
  const [agents, setAgents] = useState<{id: string, name: string}[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [formConfig, setFormConfig] = useState({
    userId: "",
    date: new Date().toISOString().substring(0, 10),
    code: "2000",
    hours: 2,
    note: ""
  })

  const OVERTIME_TYPES = [
    { code: "2000", label: "Straordinario Pagamento (Base)" },
    { code: "2050", label: "Straordinario A.O." },
    { code: "2001", label: "Straordinario Notturno" },
    { code: "2002", label: "Straordinario Festivo Diurno" },
    { code: "2003", label: "Straordinario Festivo Notturno" },
    { code: "2020", label: "Straordinario Elettorale Diurno" },
    { code: "2021", label: "Straordinario Elettorale Notturno" }
  ]

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [entriesRes, agentsRes] = await Promise.all([
        fetch(`/api/admin/overtime?year=${year}&month=${month}`),
        fetch("/api/admin/users")
      ])
      
      if (entriesRes.ok) setEntries(await entriesRes.json())
      if (agentsRes.ok) {
        const data = await agentsRes.json()
        setAgents(data.users || [])
      }
    } catch {
      toast.error("Errore caricamento dati straordinari")
    }
    setLoading(false)
  }, [year, month])

  useEffect(() => { loadData() }, [loadData])

  const changeMonth = (delta: number) => {
    let m = month + delta
    let y = year
    if (m > 12) { m = 1; y++ }
    if (m < 1) { m = 12; y-- }
    setMonth(m)
    setYear(y)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formConfig.userId || !formConfig.hours) return toast.error("Seleziona agente e ore")
    setIsSaving(true)
    try {
      const selectedType = OVERTIME_TYPES.find(t => t.code === formConfig.code)
      const res = await fetch("/api/admin/overtime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formConfig,
          label: selectedType?.label || "Straordinario"
        })
      })
      if (res.ok) {
        toast.success("Straordinario registrato")
        setShowAddForm(false)
        loadData()
      } else {
        toast.error("Errore salvataggio")
      }
    } catch {
      toast.error("Errore di rete")
    }
    setIsSaving(false)
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Cancellare lo straordinario di ${name}?`)) return
    try {
      const res = await fetch(`/api/admin/overtime?id=${id}`, { method: "DELETE" })
      if (res.ok) {
        setEntries(prev => prev.filter(e => e.id !== id))
        toast.success("Straordinario eliminato")
      }
    } catch {
      toast.error("Errore eliminazione")
    }
  }

  // Calculate totals
  const totalHours = entries.reduce((acc, curr) => acc + curr.hours, 0)
  const agentTotals = entries.reduce((acc, curr) => {
    acc[curr.user.name] = (acc[curr.user.name] || 0) + curr.hours
    return acc
  }, {} as Record<string, number>)
  
  const topAgent = Object.entries(agentTotals).sort((a,b) => b[1] - a[1])[0]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 bg-white p-6 border border-slate-200 rounded-[2rem] shadow-sm">
        <div>
           <div className="flex items-center gap-3 mb-1">
             <div className="p-2 bg-amber-100 rounded-xl"><Clock className="w-6 h-6 text-amber-600" /></div>
             <h1 className="text-2xl font-black text-slate-800 tracking-tight">Gestione Straordinari</h1>
           </div>
           <p className="text-sm text-slate-500 font-medium ml-12">Monitoraggio budget ore mensili ed elettorali</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl p-1">
            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white rounded-lg transition-colors"><ChevronLeft className="w-4 h-4" /></button>
            <span className="px-4 font-bold text-sm text-slate-800 min-w-[150px] text-center">
               {new Date(year, month - 1, 1).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }).toUpperCase()}
            </span>
            <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white rounded-lg transition-colors"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <button 
             onClick={() => setShowAddForm(!showAddForm)}
             className={`p-2.5 rounded-xl transition-all shadow-sm flex items-center gap-2 text-xs font-bold ${showAddForm ? "bg-slate-800 text-white" : "bg-amber-500 hover:bg-amber-600 text-white"}`}
          >
             {showAddForm ? "Annulla" : <><Plus className="w-4 h-4" /> Aggiungi</>}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Sidebar & Form */}
         <div className="lg:col-span-1 space-y-6">
            {/* KPI Cards */}
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-6 rounded-3xl shadow-xl text-white relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-10 translate-x-10"></div>
               <div className="flex justify-between items-start mb-6">
                  <span className="text-xs font-black uppercase tracking-widest opacity-80">Monte Ore Mese</span>
                  <Clock className="opacity-80" />
               </div>
               <div className="text-5xl font-black mb-2">{totalHours}h</div>
               {topAgent && (
                 <div className="text-xs bg-black/20 p-2.5 rounded-xl font-bold backdrop-blur-md">
                   ⚠️ Top: {topAgent[0]} ({topAgent[1]}h)
                 </div>
               )}
            </div>

            {/* Form */}
            {showAddForm && (
               <form onSubmit={handleSave} className="bg-white p-6 border border-slate-200 rounded-3xl shadow-lg border-t-4 border-t-amber-500 animate-in fade-in slide-in-from-top-4">
                  <h3 className="font-bold text-lg text-slate-800 mb-5 flex items-center gap-2">
                     <Plus className="w-5 h-5 text-amber-500" /> Nuovo Straordinario
                  </h3>
                  
                  <div className="space-y-4">
                     <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Agente</label>
                        <select 
                           value={formConfig.userId} onChange={e => setFormConfig({...formConfig, userId: e.target.value})}
                           className="w-full p-2.5 mt-1 border border-slate-200 rounded-xl text-sm font-semibold focus:border-amber-500 focus:outline-none" required
                        >
                           <option value="">Seleziona in rubrica...</option>
                           {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                     </div>
                     <div className="grid grid-cols-2 gap-3">
                        <div>
                           <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Data</label>
                           <input type="date" value={formConfig.date} onChange={e => setFormConfig({...formConfig, date: e.target.value})} className="w-full p-2.5 mt-1 border border-slate-200 rounded-xl text-sm font-semibold focus:border-amber-500 focus:outline-none" required />
                        </div>
                        <div>
                           <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Ore effettuate</label>
                           <input type="number" step="0.5" value={formConfig.hours} onChange={e => setFormConfig({...formConfig, hours: parseFloat(e.target.value)})} className="w-full p-2.5 mt-1 border border-slate-200 rounded-xl text-sm font-semibold focus:border-amber-500 focus:outline-none" required />
                        </div>
                     </div>
                     <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Tipologia / Codice</label>
                        <select 
                           value={formConfig.code} onChange={e => setFormConfig({...formConfig, code: e.target.value})}
                           className="w-full p-2.5 mt-1 border border-slate-200 rounded-xl text-sm font-semibold focus:border-amber-500 focus:outline-none"
                        >
                           {OVERTIME_TYPES.map(t => <option key={t.code} value={t.code}>[{t.code}] {t.label}</option>)}
                        </select>
                     </div>
                     <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Motivazione (Opzionale)</label>
                        <input type="text" placeholder="es. Incidente stradale, Sgombero..." value={formConfig.note} onChange={e => setFormConfig({...formConfig, note: e.target.value})} className="w-full p-2.5 mt-1 border border-slate-200 rounded-xl text-sm font-semibold focus:border-amber-500 focus:outline-none" />
                     </div>
                     <button type="submit" disabled={isSaving} className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-black rounded-xl shadow-md transition-all active:scale-[0.98]">
                        {isSaving ? "Salvataggio..." : "Registra Ora"}
                     </button>
                  </div>
               </form>
            )}
         </div>

         {/* List */}
         <div className="lg:col-span-2 bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
               <h3 className="font-bold text-slate-800 flex items-center gap-2"><CalendarDays className="w-4 h-4 text-slate-400" /> Registro Mensile</h3>
               <span className="text-xs bg-slate-200 text-slate-600 font-bold px-3 py-1 rounded-full">{entries.length} voci registrate</span>
            </div>
            
            {loading ? (
               <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-slate-300" /></div>
            ) : entries.length === 0 ? (
               <div className="p-16 text-center">
                  <AlertTriangle className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400 font-bold text-sm tracking-widest uppercase">Nessuno straordinario registrato nel mese</p>
               </div>
            ) : (
               <div className="divide-y divide-slate-100">
                  {entries.map(e => (
                     <div key={e.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                        <div className="flex gap-4 items-center">
                           <div className="hidden sm:flex flex-col items-center justify-center bg-amber-50 text-amber-600 rounded-2xl w-14 h-14 shrink-0 border border-amber-100 shadow-sm">
                              <span className="text-[10px] font-black uppercase mb-[-2px]">{new Date(e.date).toLocaleDateString('it-IT', { weekday: 'short'})}</span>
                              <span className="text-lg font-black">{new Date(e.date).getDate()}</span>
                           </div>
                           <div>
                              <div className="flex items-center gap-2 mb-1">
                                 <h4 className="font-black text-slate-800 text-sm sm:text-base">{e.user.name}</h4>
                                 {e.user.isUfficiale && <span className="bg-blue-100 text-blue-700 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">UFF</span>}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium">
                                 <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[9px]">{e.label}</span>
                                 {e.note && <span className="italic">"{e.note}"</span>}
                              </div>
                           </div>
                        </div>
                        <div className="flex items-center gap-4">
                           <div className="text-xl font-black text-amber-600 bg-amber-50 px-3 py-1 rounded-xl shadow-inner border border-amber-100">{e.hours}h</div>
                           <button onClick={() => handleDelete(e.id, e.user.name)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100" title="Elimina">
                              <Trash2 className="w-5 h-5" />
                           </button>
                        </div>
                     </div>
                  ))}
               </div>
            )}
         </div>
      </div>
    </div>
  )
}
