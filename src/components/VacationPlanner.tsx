"use client"

import { useState, useEffect } from "react"
import toast from "react-hot-toast"
import { Calendar, Plus, Trash2, Save } from "lucide-react"

const PERIODI = [
  { id: "SUMMER", label: "Estate", emoji: "☀️" },
  { id: "WINTER", label: "Inverno", emoji: "❄️" },
  { id: "EASTER", label: "Pasqua", emoji: "🐣" },
  { id: "CHRISTMAS", label: "Natale", emoji: "🎄" }
]

export default function VacationPlanner() {
  const [plans, setPlans] = useState<any[]>([])
  const [year, setYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ period: "SUMMER", startDate: "", endDate: "", notes: "", userId: "" })
  const [users, setUsers] = useState<any[]>([])
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    loadData()
  }, [year])

  const loadData = async () => {
    setLoading(true)
    const [pRes, uRes] = await Promise.all([
      fetch(`/api/admin/vacations?year=${year}`),
      fetch("/api/admin/users")
    ])
    const pData = await pRes.json()
    const uData = await uRes.json()
    setPlans(pData.plans || [])
    setUsers(uData.users || [])
    setLoading(false)
  }

  const addPlan = async () => {
    if (!form.startDate || !form.endDate || !form.userId) {
      toast.error("Compila tutti i campi")
      return
    }
    const res = await fetch("/api/admin/vacations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, status: "ASSIGNED" })
    })
    if (res.ok) {
      toast.success("Pianificazione salvata")
      setAdding(false)
      setForm({ period: "SUMMER", startDate: "", endDate: "", notes: "", userId: "" })
      loadData()
    } else {
      const e = await res.json()
      toast.error(e.error || "Errore")
    }
  }

  const deletePlan = async (id: string) => {
    await fetch(`/api/admin/vacations?id=${id}`, { method: "DELETE" })
    loadData()
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Pianificazione Ferie</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Gestione periodi ferie per anno</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setYear(y => y - 1)} className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold">←</button>
          <span className="font-black text-lg">{year}</span>
          <button onClick={() => setYear(y => y + 1)} className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold">→</button>
          <button onClick={() => setAdding(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black flex items-center gap-2">
            <Plus size={14} /> Nuova Assegnazione
          </button>
        </div>
      </div>

      {adding && (
        <div className="bg-white border border-indigo-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-black text-slate-800 mb-4">Nuova Assegnazione Ferie</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select value={form.userId} onChange={e => setForm({...form, userId: e.target.value})}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold">
              <option value="">Seleziona agente...</option>
              {users.map((u: any) => <option key={u.id} value={u.id}>{u.name} ({u.matricola})</option>)}
            </select>
            <select value={form.period} onChange={e => setForm({...form, period: e.target.value})}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold">
              {PERIODI.map(p => <option key={p.id} value={p.id}>{p.emoji} {p.label}</option>)}
            </select>
            <input type="text" placeholder="Note" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
            <input type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold" />
            <input type="date" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold" />
            <div className="flex gap-2">
              <button onClick={addPlan} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1">
                <Save size={14} /> Salva
              </button>
              <button onClick={() => setAdding(false)} className="px-4 py-2.5 bg-slate-100 rounded-xl text-xs font-bold">Annulla</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-400">Caricamento...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PERIODI.map(period => {
            const items = plans.filter((p: any) => p.period === period.id)
            return (
              <div key={period.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-black text-slate-800 mb-4">{period.emoji} {period.label} ({items.length})</h3>
                {items.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">Nessuna pianificazione</p>
                ) : (
                  <div className="space-y-2">
                    {items.map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <div>
                          <p className="text-sm font-bold text-slate-700">{p.user?.name}</p>
                          <p className="text-[10px] text-slate-400">
                            {new Date(p.startDate).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}
                            {" → "}
                            {new Date(p.endDate).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}
                            {p.notes ? ` — ${p.notes}` : ""}
                          </p>
                        </div>
                        <button onClick={() => deletePlan(p.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
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
