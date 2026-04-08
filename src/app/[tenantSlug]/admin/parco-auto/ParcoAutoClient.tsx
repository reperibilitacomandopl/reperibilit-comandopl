"use client"

import { useState } from "react"
import toast from "react-hot-toast"
import { Car, Plus, Wrench, AlertTriangle, CheckCircle2, Trash2, Edit3, X, Save, Shield } from "lucide-react"

type Vehicle = {
  id: string
  name: string
  targa: string | null
  scadenzaAssicurazione: string | null
  scadenzaBollo: string | null
  scadenzaRevisione: string | null
  stato: string
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - new Date().getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function ExpiryBadge({ label, dateStr }: { label: string; dateStr: string | null }) {
  if (!dateStr) return <span className="text-[10px] text-slate-400 font-medium">{label}: N/D</span>
  const days = daysUntil(dateStr)!
  const color = days < 0 ? "text-red-600 bg-red-50 border-red-200" : days < 30 ? "text-amber-600 bg-amber-50 border-amber-200" : "text-emerald-600 bg-emerald-50 border-emerald-200"
  const text = days < 0 ? `SCADUTA da ${Math.abs(days)}gg` : days < 30 ? `Scade tra ${days}gg` : `OK (${days}gg)`
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold ${color}`}>
      <span className="opacity-70">{label}:</span> {text}
    </div>
  )
}

const STATO_OPTIONS = [
  { value: "ATTIVO", label: "Attivo", color: "bg-emerald-100 text-emerald-700 border-emerald-300", icon: CheckCircle2 },
  { value: "MANUTENZIONE", label: "In Manutenzione", color: "bg-amber-100 text-amber-700 border-amber-300", icon: Wrench },
  { value: "DISMESSO", label: "Dismesso", color: "bg-red-100 text-red-700 border-red-300", icon: AlertTriangle },
]

export default function ParcoAutoClient({ vehicles: initial }: { vehicles: Vehicle[] }) {
  const [vehicles, setVehicles] = useState<Vehicle[]>(initial)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [form, setForm] = useState({ name: "", targa: "", scadenzaAssicurazione: "", scadenzaBollo: "", scadenzaRevisione: "", stato: "ATTIVO" })

  const resetForm = () => { setForm({ name: "", targa: "", scadenzaAssicurazione: "", scadenzaBollo: "", scadenzaRevisione: "", stato: "ATTIVO" }); setEditingId(null); setShowForm(false) }

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("Il nome del veicolo è obbligatorio")
    setSaving(true)
    try {
      const method = editingId ? "PUT" : "POST"
      const res = await fetch("/api/admin/vehicles", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, id: editingId })
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      const data = await res.json()
      if (editingId) {
        setVehicles(prev => prev.map(v => v.id === editingId ? data.vehicle : v))
        toast.success("Veicolo aggiornato!")
      } else {
        setVehicles(prev => [...prev, data.vehicle])
        toast.success("Veicolo aggiunto!")
      }
      resetForm()
    } catch (e: any) { toast.error(e.message || "Errore") }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Eliminare questo veicolo?")) return
    try {
      const res = await fetch("/api/admin/vehicles", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })
      if (!res.ok) throw new Error()
      setVehicles(prev => prev.filter(v => v.id !== id))
      toast.success("Veicolo eliminato")
    } catch { toast.error("Errore eliminazione") }
  }

  const startEdit = (v: Vehicle) => {
    setForm({
      name: v.name, targa: v.targa || "",
      scadenzaAssicurazione: v.scadenzaAssicurazione ? v.scadenzaAssicurazione.split("T")[0] : "",
      scadenzaBollo: v.scadenzaBollo ? v.scadenzaBollo.split("T")[0] : "",
      scadenzaRevisione: v.scadenzaRevisione ? v.scadenzaRevisione.split("T")[0] : "",
      stato: v.stato
    })
    setEditingId(v.id)
    setShowForm(true)
  }

  // Alert count
  const alertCount = vehicles.filter(v => {
    const days = [v.scadenzaAssicurazione, v.scadenzaBollo, v.scadenzaRevisione].map(d => daysUntil(d)).filter(d => d !== null)
    return days.some(d => d! < 30)
  }).length

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-amber-100 rounded-xl"><Car size={24} className="text-amber-600" /></div>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-slate-800">Parco Auto</h1>
            {alertCount > 0 && (
              <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-black rounded-full border border-red-200 animate-pulse">
                {alertCount} {alertCount === 1 ? "Alert" : "Alerts"}
              </span>
            )}
          </div>
          <p className="text-slate-500 text-sm font-medium">Gestione veicoli, targhe e scadenze documentali.</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true) }} className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-5 py-3 rounded-2xl font-bold shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 hover:-translate-y-0.5 transition-all">
          <Plus size={18} /> Aggiungi Veicolo
        </button>
      </div>

      {/* Form (Create/Edit) */}
      {showForm && (
        <div className="bg-white border-2 border-amber-200 rounded-3xl p-6 shadow-xl shadow-amber-900/5 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">{editingId ? "Modifica Veicolo" : "Nuovo Veicolo"}</h2>
            <button onClick={resetForm} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><X size={18} className="text-slate-400" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nome / Sigla *</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Es: Alfa 1" className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20 transition-all" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Targa</label>
              <input value={form.targa} onChange={e => setForm({...form, targa: e.target.value.toUpperCase()})} placeholder="EA123BC" className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold uppercase outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20 transition-all" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Stato</label>
              <select value={form.stato} onChange={e => setForm({...form, stato: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20 transition-all">
                {STATO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Scadenza Assicurazione</label>
              <input type="date" value={form.scadenzaAssicurazione} onChange={e => setForm({...form, scadenzaAssicurazione: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20 transition-all" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Scadenza Bollo</label>
              <input type="date" value={form.scadenzaBollo} onChange={e => setForm({...form, scadenzaBollo: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20 transition-all" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Scadenza Revisione</label>
              <input type="date" value={form.scadenzaRevisione} onChange={e => setForm({...form, scadenzaRevisione: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20 transition-all" />
            </div>
          </div>
          <div className="flex justify-end mt-5">
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all disabled:opacity-50">
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
              {editingId ? "Salva Modifiche" : "Crea Veicolo"}
            </button>
          </div>
        </div>
      )}

      {/* Vehicle List */}
      {vehicles.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
          <Car size={48} className="mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-bold text-slate-400 mb-1">Nessun veicolo registrato</h3>
          <p className="text-sm text-slate-400">Clicca "Aggiungi Veicolo" per iniziare.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {vehicles.map(v => {
            const statoInfo = STATO_OPTIONS.find(o => o.value === v.stato) || STATO_OPTIONS[0]
            const StatoIcon = statoInfo.icon
            return (
              <div key={v.id} className="bg-white border-2 border-slate-100 hover:border-amber-200 rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all duration-300 group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 group-hover:bg-amber-50 rounded-lg transition-colors">
                      <Car size={20} className="text-slate-500 group-hover:text-amber-600 transition-colors" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-800">{v.name}</h3>
                      <p className="text-xs font-bold text-slate-400 tracking-wider">{v.targa || "Targa non inserita"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10px] font-black ${statoInfo.color}`}>
                      <StatoIcon size={12} /> {statoInfo.label}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  <ExpiryBadge label="Assicurazione" dateStr={v.scadenzaAssicurazione} />
                  <ExpiryBadge label="Bollo" dateStr={v.scadenzaBollo} />
                  <ExpiryBadge label="Revisione" dateStr={v.scadenzaRevisione} />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button onClick={() => startEdit(v)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all">
                    <Edit3 size={13} /> Modifica
                  </button>
                  <button onClick={() => handleDelete(v.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                    <Trash2 size={13} /> Elimina
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
