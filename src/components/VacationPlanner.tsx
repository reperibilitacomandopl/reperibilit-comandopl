"use client"

import { useState, useEffect } from "react"
import toast from "react-hot-toast"
import { Calendar, Plus, Trash2, Save, X, Info } from "lucide-react"

const PERIODI = [
  { id: "SUMMER", label: "Estate", emoji: "☀️", color: "amber" },
  { id: "WINTER", label: "Inverno", emoji: "❄️", color: "blue" },
  { id: "EASTER", label: "Pasqua", emoji: "🐣", color: "emerald" },
  { id: "CHRISTMAS", label: "Natale", emoji: "🎄", color: "rose" }
]

const STATUS_OPTIONS = [
  { id: "PREFERENCE", label: "Preferenza", class: "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400" },
  { id: "ASSIGNED", label: "Assegnato", class: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400" },
  { id: "CONFIRMED", label: "Confermato", class: "bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400" }
]

export default function VacationPlanner() {
  const [plans, setPlans] = useState<any[]>([])
  const [year, setYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ period: "SUMMER", startDate: "", endDate: "", notes: "", userId: "", status: "ASSIGNED" })
  const [users, setUsers] = useState<any[]>([])
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    loadData()
  }, [year])

  const loadData = async () => {
    setLoading(true)
    try {
      const [pRes, uRes] = await Promise.all([
        fetch(`/api/admin/vacations?year=${year}`),
        fetch("/api/admin/users")
      ])
      const pData = await pRes.json()
      const uData = await uRes.json()
      setPlans(pData.plans || [])
      setUsers(uData.users || [])
    } catch (e) {
      console.error("Error loading vacations:", e)
      toast.error("Errore nel caricamento dei dati")
    } finally {
      setLoading(false)
    }
  }

  const addPlan = async () => {
    if (!form.startDate || !form.endDate || !form.userId) {
      toast.error("Compila tutti i campi obbligatori")
      return
    }
    try {
      const res = await fetch("/api/admin/vacations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      })
      if (res.ok) {
        toast.success("Pianificazione ferie salvata")
        setAdding(false)
        setForm({ period: "SUMMER", startDate: "", endDate: "", notes: "", userId: "", status: "ASSIGNED" })
        loadData()
      } else {
        const e = await res.json()
        toast.error(e.error || "Errore nel salvataggio")
      }
    } catch (err) {
      toast.error("Errore di rete")
    }
  }

  const deletePlan = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questa assegnazione?")) return
    try {
      const res = await fetch(`/api/admin/vacations?id=${id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Assegnazione eliminata")
        loadData()
      } else {
        toast.error("Errore durante l'eliminazione")
      }
    } catch (err) {
      toast.error("Errore di connessione")
    }
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Pianificazione Ferie</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Gestione strategica dei periodi di congedo annuali</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200/50 dark:border-slate-700/50 shadow-inner">
            <button 
              onClick={() => setYear(y => y - 1)} 
              className="px-3 py-1.5 hover:bg-white dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-black transition-all"
            >
              ←
            </button>
            <span className="font-black text-sm text-slate-800 dark:text-white px-4">{year}</span>
            <button 
              onClick={() => setYear(y => y + 1)} 
              className="px-3 py-1.5 hover:bg-white dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-black transition-all"
            >
              →
            </button>
          </div>
          <button 
            onClick={() => setAdding(true)} 
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 transition-all uppercase tracking-wider"
          >
            <Plus size={14} /> Nuova Assegnazione
          </button>
        </div>
      </div>

      {adding && (
        <div className="bg-white dark:bg-slate-900 border border-blue-100 dark:border-slate-850 rounded-2xl p-6 shadow-xl shadow-slate-100/40 dark:shadow-none animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between mb-5 border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Nuova Assegnazione Ferie</h3>
            <button onClick={() => setAdding(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Agente</label>
              <select 
                value={form.userId} 
                onChange={e => setForm({...form, userId: e.target.value})}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
              >
                <option value="">Seleziona agente...</option>
                {users.map((u: any) => <option key={u.id} value={u.id}>{u.name} ({u.matricola})</option>)}
              </select>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Periodo</label>
              <select 
                value={form.period} 
                onChange={e => setForm({...form, period: e.target.value})}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
              >
                {PERIODI.map(p => <option key={p.id} value={p.id}>{p.emoji} {p.label}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Stato</label>
              <select 
                value={form.status} 
                onChange={e => setForm({...form, status: e.target.value})}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
              >
                <option value="PREFERENCE">🔵 Preferenza</option>
                <option value="ASSIGNED">🟢 Assegnato</option>
                <option value="CONFIRMED">🟣 Confermato</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Data Inizio</label>
              <input 
                type="date" 
                value={form.startDate} 
                onChange={e => setForm({...form, startDate: e.target.value})}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none" 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Data Fine</label>
              <input 
                type="date" 
                value={form.endDate} 
                onChange={e => setForm({...form, endDate: e.target.value})}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none" 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Note o Specifiche</label>
              <input 
                type="text" 
                placeholder="es. Ferie estive 1° turno" 
                value={form.notes} 
                onChange={e => setForm({...form, notes: e.target.value})}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none" 
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6 border-t border-slate-100 dark:border-slate-800 pt-4 justify-end">
            <button 
              onClick={() => setAdding(false)} 
              className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
            >
              Annulla
            </button>
            <button 
              onClick={addPlan} 
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 transition-all uppercase tracking-wider"
            >
              <Save size={14} /> Salva Assegnazione
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-slate-500 dark:text-slate-400 font-bold animate-pulse">
          Caricamento pianificazioni...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PERIODI.map(period => {
            const items = plans.filter((p: any) => p.period === period.id)
            return (
              <div key={period.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-5 border-b border-slate-100 dark:border-slate-800 pb-3.5">
                  <h3 className="text-lg font-black text-slate-850 dark:text-white uppercase tracking-tight flex items-center gap-2.5">
                    <span className="text-xl">{period.emoji}</span> {period.label}
                  </h3>
                  <span className="text-xs font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-450 px-2.5 py-1 rounded-xl">
                    {items.length} pianificazioni
                  </span>
                </div>
                
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400 dark:text-slate-650 bg-slate-50/40 dark:bg-slate-950/20 rounded-2xl border border-dashed border-slate-200/80 dark:border-slate-850">
                    <Info size={20} className="mb-2 text-slate-300 dark:text-slate-700" />
                    <p className="text-xs font-bold">Nessuna assegnazione per questo periodo</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[350px] overflow-y-auto custom-scrollbar-dark pr-1.5">
                    {items.map((p: any) => {
                      const matchedStatus = STATUS_OPTIONS.find(o => o.id === p.status) || STATUS_OPTIONS[1]
                      return (
                        <div 
                          key={p.id} 
                          className="flex items-center justify-between bg-slate-50/60 dark:bg-slate-950/40 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/60 transition-all hover:border-slate-200 dark:hover:border-slate-750"
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2.5">
                              <p className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">
                                {p.user?.name}
                              </p>
                              {p.user?.squadra && (
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                  {p.user.squadra}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="text-slate-500 dark:text-slate-400 font-semibold bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 px-2 py-0.5 rounded-lg">
                                {new Date(p.startDate).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}
                                {" → "}
                                {new Date(p.endDate).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}
                              </span>
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg tracking-widest uppercase ${matchedStatus.class}`}>
                                {matchedStatus.label}
                              </span>
                            </div>
                            {p.notes && (
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium italic mt-1 bg-white/40 dark:bg-slate-900/40 px-2 py-1 rounded-lg border border-slate-100/50 dark:border-slate-850/50 inline-block">
                                {p.notes}
                              </p>
                            )}
                          </div>
                          <button 
                            onClick={() => deletePlan(p.id)} 
                            className="p-2.5 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all shadow-sm border border-transparent hover:border-red-100 dark:hover:border-red-950/50"
                            title="Elimina pianificazione"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
