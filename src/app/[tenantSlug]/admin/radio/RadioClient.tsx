"use client"

import { useState } from "react"
import toast from "react-hot-toast"
import { Radio, Plus, Wrench, AlertTriangle, CheckCircle2, Trash2, Edit3, X, Save, Battery } from "lucide-react"

type RadioItem = {
  id: string
  name: string
  modello: string | null
  seriale: string | null
  assegnazioneFissaId: string | null
  dataAssegnazione: string | null
  cambioBatteria: string | null
  stato: string
  assegnatario?: { id: string, name: string, matricola: string } | null
}

type UserItem = {
  id: string
  name: string
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - new Date().getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function ExpiryBadge({ label, dateStr, isBattery = false }: { label: string; dateStr: string | null; isBattery?: boolean }) {
  if (!dateStr) return <span className="text-[10px] text-slate-400 font-medium">{label}: N/D</span>
  const days = daysUntil(dateStr)!
  const color = days < 0 ? "text-red-600 bg-red-50 border-red-200" : days < 30 ? "text-amber-600 bg-amber-50 border-amber-200" : "text-emerald-600 bg-emerald-50 border-emerald-200"
  const text = days < 0 ? `SCADUTO da ${Math.abs(days)}gg` : days < 30 ? `Scade tra ${days}gg` : `OK (${days}gg)`
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold ${color}`}>
      {isBattery && <Battery size={12} />}
      <span className="opacity-70">{label}:</span> {text}
    </div>
  )
}

const STATO_OPTIONS = [
  { value: "ATTIVO", label: "Attivo", color: "bg-emerald-100 text-emerald-700 border-emerald-300", icon: CheckCircle2 },
  { value: "MANUTENZIONE", label: "In Manutenzione", color: "bg-amber-100 text-amber-700 border-amber-300", icon: Wrench },
  { value: "DISMESSO", label: "Dismesso", color: "bg-red-100 text-red-700 border-red-300", icon: AlertTriangle },
]

export default function RadioClient({ radios: initial, users }: { radios: RadioItem[], users: UserItem[] }) {
  const [radios, setRadios] = useState<RadioItem[]>(initial)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [form, setForm] = useState({ name: "", modello: "", seriale: "", stato: "ATTIVO", assegnazioneFissaId: "", dataAssegnazione: "", cambioBatteria: "" })

  const resetForm = () => { setForm({ name: "", modello: "", seriale: "", stato: "ATTIVO", assegnazioneFissaId: "", dataAssegnazione: "", cambioBatteria: "" }); setEditingId(null); setShowForm(false) }

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("Il nome della radio è obbligatorio")
    setSaving(true)
    try {
      const method = editingId ? "PUT" : "POST"
      const res = await fetch("/api/admin/radios", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, id: editingId })
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Errore sconosciuto") }
      const data = await res.json()
      if (editingId) {
        setRadios(prev => prev.map((r: any) => r.id === editingId ? data.radio : r))
        toast.success("Radio aggiornata!")
      } else {
        setRadios(prev => [...prev, data.radio])
        toast.success("Radio aggiunta!")
      }
      resetForm()
    } catch (e: any) { toast.error(e.message || "Errore durante il salvataggio") }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Eliminare questa radio?")) return
    try {
      const res = await fetch("/api/admin/radios", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })
      if (!res.ok) throw new Error()
      setRadios(prev => prev.filter((r: any) => r.id !== id))
      toast.success("Radio eliminata")
    } catch { toast.error("Errore eliminazione") }
  }

  const startEdit = (r: RadioItem) => {
    setForm({
      name: r.name, 
      modello: r.modello || "",
      seriale: r.seriale || "",
      assegnazioneFissaId: r.assegnazioneFissaId || "",
      dataAssegnazione: r.dataAssegnazione ? r.dataAssegnazione.split("T")[0] : "",
      cambioBatteria: r.cambioBatteria ? r.cambioBatteria.split("T")[0] : "",
      stato: r.stato
    })
    setEditingId(r.id)
    setShowForm(true)
  }

  // Alert count (Battery expired or expiring)
  const alertCount = radios.filter((r: any) => {
    const days = daysUntil(r.cambioBatteria)
    return days !== null && days < 30
  }).length

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-indigo-100 rounded-xl"><Radio size={24} className="text-indigo-600" /></div>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-slate-800">Inventario Radio</h1>
            {alertCount > 0 && (
              <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-black rounded-full border border-red-200 animate-pulse">
                {alertCount} {alertCount === 1 ? "Alert Batteria" : "Alert Batterie"}
              </span>
            )}
          </div>
          <p className="text-slate-500 text-sm font-medium">Gestione apparati radio, assegnazioni fisse e stato batterie.</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true) }} className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-5 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5 transition-all">
          <Plus size={18} /> Aggiungi Radio
        </button>
      </div>

      {/* Form (Create/Edit) */}
      {showForm && (
        <div className="bg-white border-2 border-indigo-200 rounded-3xl p-6 shadow-xl shadow-indigo-900/5 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">{editingId ? "Modifica Radio" : "Nuova Radio"}</h2>
            <button onClick={resetForm} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><X size={18} className="text-slate-400" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nome / Sigla *</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Es: P01, Portatile 1..." className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Modello</label>
              <input value={form.modello} onChange={e => setForm({...form, modello: e.target.value})} placeholder="Es: Motorola Tetra" className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Seriale / IMEI</label>
              <input value={form.seriale} onChange={e => setForm({...form, seriale: e.target.value})} placeholder="S/N..." className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold uppercase outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Stato</label>
              <select value={form.stato} onChange={e => setForm({...form, stato: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all">
                {STATO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Assegnazione Fissa (Opzionale)</label>
              <select value={form.assegnazioneFissaId} onChange={e => setForm({...form, assegnazioneFissaId: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all">
                <option value="">Nessuna (Radio di Reparto)</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Data Assegnazione</label>
              <input type="date" value={form.dataAssegnazione} onChange={e => setForm({...form, dataAssegnazione: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Scadenza Batteria</label>
              <input type="date" value={form.cambioBatteria} onChange={e => setForm({...form, cambioBatteria: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all" />
            </div>
          </div>
          <div className="flex justify-end mt-5">
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all disabled:opacity-50">
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
              {editingId ? "Salva Modifiche" : "Crea Radio"}
            </button>
          </div>
        </div>
      )}

      {/* Radio List */}
      {radios.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
          <Radio size={48} className="mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-bold text-slate-400 mb-1">Nessuna radio registrata</h3>
          <p className="text-sm text-slate-400">Clicca "Aggiungi Radio" per iniziare.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {radios.map((r: any) => {
            const statoInfo = STATO_OPTIONS.find(o => o.value === r.stato) || STATO_OPTIONS[0]
            const StatoIcon = statoInfo.icon
            return (
              <div key={r.id} className="bg-white border-2 border-slate-100 hover:border-indigo-200 rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all duration-300 group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 group-hover:bg-indigo-50 rounded-lg transition-colors">
                      <Radio size={20} className="text-slate-500 group-hover:text-indigo-600 transition-colors" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-800">{r.name}</h3>
                      <p className="text-xs font-bold text-slate-400 tracking-wider">
                        {r.modello ? `${r.modello} - ` : ""}
                        {r.seriale ? `S/N: ${r.seriale}` : "Seriale non inserito"}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10px] font-black ${statoInfo.color}`}>
                      <StatoIcon size={12} /> {statoInfo.label}
                    </span>
                    {r.assegnatario && (
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        Ass. fissa: {r.assegnatario.name}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  <ExpiryBadge label="Batteria" dateStr={r.cambioBatteria} isBattery={true} />
                  {r.dataAssegnazione && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold text-slate-600 bg-slate-50 border-slate-200">
                      <span className="opacity-70">Assegnata dal:</span> {new Date(r.dataAssegnazione).toLocaleDateString('it-IT')}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button onClick={() => startEdit(r)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                    <Edit3 size={13} /> Modifica
                  </button>
                  <button onClick={() => handleDelete(r.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
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
