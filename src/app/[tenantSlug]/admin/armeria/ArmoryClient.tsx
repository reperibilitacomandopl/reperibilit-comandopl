"use client"

import { useState } from "react"
import toast from "react-hot-toast"
import { Crosshair, Shield, Plus, Wrench, AlertTriangle, CheckCircle2, Trash2, Edit3, X, Save, Clock } from "lucide-react"

type WeaponItem = {
  id: string
  name: string
  modello: string | null
  matricola: string | null
  assegnazioneFissaId: string | null
  dataAssegnazione: string | null
  note: string | null
  stato: string
  assegnatario?: { id: string, name: string, matricola: string } | null
}

type ArmorItem = {
  id: string
  name: string
  modello: string | null
  seriale: string | null
  assegnazioneFissaId: string | null
  dataAssegnazione: string | null
  scadenzaKevlar: string | null
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

function ExpiryBadge({ label, dateStr }: { label: string; dateStr: string | null }) {
  if (!dateStr) return <span className="text-[10px] text-slate-400 font-medium">{label}: N/D</span>
  const days = daysUntil(dateStr)!
  const color = days < 0 ? "text-red-600 bg-red-50 border-red-200" : days < 30 ? "text-amber-600 bg-amber-50 border-amber-200" : "text-emerald-600 bg-emerald-50 border-emerald-200"
  const text = days < 0 ? `SCADUTO da ${Math.abs(days)}gg` : days < 30 ? `Scade tra ${days}gg` : `OK (${days}gg)`
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold ${color}`}>
      <Clock size={12} />
      <span className="opacity-70">{label}:</span> {text}
    </div>
  )
}

const STATO_OPTIONS = [
  { value: "ATTIVO", label: "Attivo / Assegnato", color: "bg-emerald-100 text-emerald-700 border-emerald-300", icon: CheckCircle2 },
  { value: "MANUTENZIONE", label: "In Manutenzione", color: "bg-amber-100 text-amber-700 border-amber-300", icon: Wrench },
  { value: "DISMESSO", label: "Dismesso / Riconsegnato", color: "bg-red-100 text-red-700 border-red-300", icon: AlertTriangle },
]

export default function ArmoryClient({ 
  initialWeapons, 
  initialArmors, 
  users 
}: { 
  initialWeapons: WeaponItem[], 
  initialArmors: ArmorItem[], 
  users: UserItem[] 
}) {
  const [activeTab, setActiveTab] = useState<"WEAPONS" | "ARMORS">("WEAPONS")
  const [weapons, setWeapons] = useState<WeaponItem[]>(initialWeapons)
  const [armors, setArmors] = useState<ArmorItem[]>(initialArmors)
  
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Form states
  const [weaponForm, setWeaponForm] = useState({ name: "", modello: "", matricola: "", stato: "ATTIVO", assegnazioneFissaId: "", dataAssegnazione: "", note: "" })
  const [armorForm, setArmorForm] = useState({ name: "", modello: "", seriale: "", stato: "ATTIVO", assegnazioneFissaId: "", dataAssegnazione: "", scadenzaKevlar: "" })

  const resetForm = () => {
    setWeaponForm({ name: "", modello: "", matricola: "", stato: "ATTIVO", assegnazioneFissaId: "", dataAssegnazione: "", note: "" })
    setArmorForm({ name: "", modello: "", seriale: "", stato: "ATTIVO", assegnazioneFissaId: "", dataAssegnazione: "", scadenzaKevlar: "" })
    setEditingId(null)
    setShowForm(false)
  }

  const handleSaveWeapon = async () => {
    if (!weaponForm.name.trim()) return toast.error("Il nome dell'arma è obbligatorio")
    setSaving(true)
    try {
      const method = editingId ? "PUT" : "POST"
      const res = await fetch("/api/admin/armory/weapons", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...weaponForm, id: editingId })
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Errore sconosciuto") }
      const data = await res.json()
      if (editingId) {
        setWeapons(prev => prev.map(w => w.id === editingId ? data.weapon : w))
        toast.success("Arma aggiornata!")
      } else {
        setWeapons(prev => [...prev, data.weapon])
        toast.success("Arma aggiunta!")
      }
      resetForm()
    } catch (e: any) { toast.error(e.message || "Errore durante il salvataggio") }
    finally { setSaving(false) }
  }

  const handleSaveArmor = async () => {
    if (!armorForm.name.trim()) return toast.error("Il nome del GAP è obbligatorio")
    setSaving(true)
    try {
      const method = editingId ? "PUT" : "POST"
      const res = await fetch("/api/admin/armory/armors", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...armorForm, id: editingId })
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Errore sconosciuto") }
      const data = await res.json()
      if (editingId) {
        setArmors(prev => prev.map(a => a.id === editingId ? data.armor : a))
        toast.success("GAP aggiornato!")
      } else {
        setArmors(prev => [...prev, data.armor])
        toast.success("GAP aggiunto!")
      }
      resetForm()
    } catch (e: any) { toast.error(e.message || "Errore durante il salvataggio") }
    finally { setSaving(false) }
  }

  const handleDeleteWeapon = async (id: string) => {
    if (!confirm("Eliminare questa arma?")) return
    try {
      const res = await fetch("/api/admin/armory/weapons", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })
      if (!res.ok) throw new Error()
      setWeapons(prev => prev.filter(w => w.id !== id))
      toast.success("Arma eliminata")
    } catch { toast.error("Errore eliminazione") }
  }

  const handleDeleteArmor = async (id: string) => {
    if (!confirm("Eliminare questo GAP?")) return
    try {
      const res = await fetch("/api/admin/armory/armors", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })
      if (!res.ok) throw new Error()
      setArmors(prev => prev.filter(a => a.id !== id))
      toast.success("GAP eliminato")
    } catch { toast.error("Errore eliminazione") }
  }

  const startEditWeapon = (w: WeaponItem) => {
    setWeaponForm({
      name: w.name, 
      modello: w.modello || "",
      matricola: w.matricola || "",
      assegnazioneFissaId: w.assegnazioneFissaId || "",
      dataAssegnazione: w.dataAssegnazione ? w.dataAssegnazione.split("T")[0] : "",
      note: w.note || "",
      stato: w.stato
    })
    setEditingId(w.id)
    setShowForm(true)
  }

  const startEditArmor = (a: ArmorItem) => {
    setArmorForm({
      name: a.name, 
      modello: a.modello || "",
      seriale: a.seriale || "",
      assegnazioneFissaId: a.assegnazioneFissaId || "",
      dataAssegnazione: a.dataAssegnazione ? a.dataAssegnazione.split("T")[0] : "",
      scadenzaKevlar: a.scadenzaKevlar ? a.scadenzaKevlar.split("T")[0] : "",
      stato: a.stato
    })
    setEditingId(a.id)
    setShowForm(true)
  }

  // Alert counts
  const armorAlertCount = armors.filter(a => {
    const days = daysUntil(a.scadenzaKevlar)
    return days !== null && days < 90 // 3 months notice for Kevlar
  }).length

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-slate-800 rounded-xl">
              {activeTab === "WEAPONS" ? <Crosshair size={24} className="text-white" /> : <Shield size={24} className="text-white" />}
            </div>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-slate-800">
              Gestione Armeria
            </h1>
            {armorAlertCount > 0 && (
              <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-black rounded-full border border-red-200 animate-pulse" title="Scadenza Kevlar ravvicinata (< 90gg)">
                {armorAlertCount} Alert GAP
              </span>
            )}
          </div>
          <p className="text-slate-500 text-sm font-medium">Inventario, assegnazioni e scadenze di armi e GAP.</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true) }} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-5 py-3 rounded-2xl font-bold shadow-lg shadow-slate-900/20 hover:shadow-slate-900/40 hover:-translate-y-0.5 transition-all">
          <Plus size={18} /> Aggiungi {activeTab === "WEAPONS" ? "Arma" : "GAP"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit">
        <button 
          onClick={() => { setActiveTab("WEAPONS"); setShowForm(false) }}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "WEAPONS" ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'}`}
        >
          <Crosshair size={16} /> Armi ({weapons.length})
        </button>
        <button 
          onClick={() => { setActiveTab("ARMORS"); setShowForm(false) }}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "ARMORS" ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'}`}
        >
          <Shield size={16} /> GAP ({armors.length})
          {armorAlertCount > 0 && <span className="w-2 h-2 rounded-full bg-red-500 ml-1 animate-pulse"></span>}
        </button>
      </div>

      {/* Forms */}
      {showForm && activeTab === "WEAPONS" && (
        <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-xl shadow-slate-900/5 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Crosshair size={18}/> {editingId ? "Modifica Arma" : "Nuova Arma"}</h2>
            <button onClick={resetForm} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><X size={18} className="text-slate-400" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nome / Modello *</label>
              <input value={weaponForm.name} onChange={e => setWeaponForm({...weaponForm, name: e.target.value})} placeholder="Es: Beretta 92FS" className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-slate-500 focus:ring-4 focus:ring-slate-500/20 transition-all" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Matricola</label>
              <input value={weaponForm.matricola} onChange={e => setWeaponForm({...weaponForm, matricola: e.target.value})} placeholder="Es: B12345Z" className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-slate-500 focus:ring-4 focus:ring-slate-500/20 transition-all uppercase" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Stato</label>
              <select value={weaponForm.stato} onChange={e => setWeaponForm({...weaponForm, stato: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-slate-500 focus:ring-4 focus:ring-slate-500/20 transition-all">
                {STATO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Assegnazione Fissa (Opzionale)</label>
              <select value={weaponForm.assegnazioneFissaId} onChange={e => setWeaponForm({...weaponForm, assegnazioneFissaId: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-slate-500 focus:ring-4 focus:ring-slate-500/20 transition-all">
                <option value="">Nessuna (Arma di Reparto)</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Data Assegnazione</label>
              <input type="date" value={weaponForm.dataAssegnazione} onChange={e => setWeaponForm({...weaponForm, dataAssegnazione: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-slate-500 focus:ring-4 focus:ring-slate-500/20 transition-all" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Note (Es. Manutenzioni)</label>
              <input value={weaponForm.note} onChange={e => setWeaponForm({...weaponForm, note: e.target.value})} placeholder="Note..." className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-slate-500 focus:ring-4 focus:ring-slate-500/20 transition-all" />
            </div>
          </div>
          <div className="flex justify-end mt-5">
            <button onClick={handleSaveWeapon} disabled={saving} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all disabled:opacity-50">
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
              {editingId ? "Salva Modifiche" : "Registra Arma"}
            </button>
          </div>
        </div>
      )}

      {showForm && activeTab === "ARMORS" && (
        <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-xl shadow-slate-900/5 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Shield size={18}/> {editingId ? "Modifica GAP" : "Nuovo GAP"}</h2>
            <button onClick={resetForm} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><X size={18} className="text-slate-400" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Marca / Modello *</label>
              <input value={armorForm.name} onChange={e => setArmorForm({...armorForm, name: e.target.value})} placeholder="Es: GAP Livello IIIA" className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-slate-500 focus:ring-4 focus:ring-slate-500/20 transition-all" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Seriale</label>
              <input value={armorForm.seriale} onChange={e => setArmorForm({...armorForm, seriale: e.target.value})} placeholder="Es: GAP-1234" className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-slate-500 focus:ring-4 focus:ring-slate-500/20 transition-all uppercase" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Stato</label>
              <select value={armorForm.stato} onChange={e => setArmorForm({...armorForm, stato: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-slate-500 focus:ring-4 focus:ring-slate-500/20 transition-all">
                {STATO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Assegnazione Fissa</label>
              <select value={armorForm.assegnazioneFissaId} onChange={e => setArmorForm({...armorForm, assegnazioneFissaId: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-slate-500 focus:ring-4 focus:ring-slate-500/20 transition-all">
                <option value="">Nessuna (GAP di Reparto)</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Data Assegnazione</label>
              <input type="date" value={armorForm.dataAssegnazione} onChange={e => setArmorForm({...armorForm, dataAssegnazione: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-slate-500 focus:ring-4 focus:ring-slate-500/20 transition-all" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Scadenza Kevlar *</label>
              <input type="date" value={armorForm.scadenzaKevlar} onChange={e => setArmorForm({...armorForm, scadenzaKevlar: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-slate-500 focus:ring-4 focus:ring-slate-500/20 transition-all" />
            </div>
          </div>
          <div className="flex justify-end mt-5">
            <button onClick={handleSaveArmor} disabled={saving} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all disabled:opacity-50">
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
              {editingId ? "Salva Modifiche" : "Registra GAP"}
            </button>
          </div>
        </div>
      )}

      {/* Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {activeTab === "WEAPONS" && weapons.map(w => {
          const statoInfo = STATO_OPTIONS.find(o => o.value === w.stato) || STATO_OPTIONS[0]
          const StatoIcon = statoInfo.icon
          return (
            <div key={w.id} className="bg-white border-2 border-slate-100 hover:border-slate-300 rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all duration-300 group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 group-hover:bg-slate-800 rounded-lg transition-colors">
                    <Crosshair size={20} className="text-slate-500 group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-800">{w.name}</h3>
                    <p className="text-xs font-bold text-slate-400 tracking-wider">
                      {w.matricola ? `MATR: ${w.matricola}` : "Nessuna matricola registrata"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10px] font-black ${statoInfo.color}`}>
                    <StatoIcon size={12} /> {statoInfo.label}
                  </span>
                  {w.assegnatario && (
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      Ass. {w.assegnatario.name}
                    </span>
                  )}
                </div>
              </div>
              
              {(w.dataAssegnazione || w.note) && (
                <div className="flex flex-col gap-1 mt-3 mb-4 text-xs font-medium text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {w.dataAssegnazione && <div><span className="opacity-70">Assegnata dal:</span> {new Date(w.dataAssegnazione).toLocaleDateString('it-IT')}</div>}
                  {w.note && <div><span className="opacity-70">Note:</span> {w.note}</div>}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 mt-auto">
                <button onClick={() => startEditWeapon(w)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all">
                  <Edit3 size={13} /> Modifica
                </button>
                <button onClick={() => handleDeleteWeapon(w.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                  <Trash2 size={13} /> Elimina
                </button>
              </div>
            </div>
          )
        })}

        {activeTab === "ARMORS" && armors.map(a => {
          const statoInfo = STATO_OPTIONS.find(o => o.value === a.stato) || STATO_OPTIONS[0]
          const StatoIcon = statoInfo.icon
          return (
            <div key={a.id} className="bg-white border-2 border-slate-100 hover:border-slate-300 rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all duration-300 group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 group-hover:bg-slate-800 rounded-lg transition-colors">
                    <Shield size={20} className="text-slate-500 group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-800">{a.name}</h3>
                    <p className="text-xs font-bold text-slate-400 tracking-wider">
                      {a.seriale ? `S/N: ${a.seriale}` : "Nessun seriale registrato"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10px] font-black ${statoInfo.color}`}>
                    <StatoIcon size={12} /> {statoInfo.label}
                  </span>
                  {a.assegnatario && (
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      Ass. {a.assegnatario.name}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-4 mt-3">
                <ExpiryBadge label="Scadenza Kevlar" dateStr={a.scadenzaKevlar} />
                {a.dataAssegnazione && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold text-slate-600 bg-slate-50 border-slate-200">
                    <span className="opacity-70">Assegnato dal:</span> {new Date(a.dataAssegnazione).toLocaleDateString('it-IT')}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 mt-auto">
                <button onClick={() => startEditArmor(a)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all">
                  <Edit3 size={13} /> Modifica
                </button>
                <button onClick={() => handleDeleteArmor(a.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                  <Trash2 size={13} /> Elimina
                </button>
              </div>
            </div>
          )
        })}

        {activeTab === "WEAPONS" && weapons.length === 0 && (
          <div className="col-span-full bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
            <Crosshair size={48} className="mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-bold text-slate-400 mb-1">Nessuna arma registrata</h3>
            <p className="text-sm text-slate-400">Clicca "Aggiungi Arma" per iniziare.</p>
          </div>
        )}

        {activeTab === "ARMORS" && armors.length === 0 && (
          <div className="col-span-full bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
            <Shield size={48} className="mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-bold text-slate-400 mb-1">Nessun GAP registrato</h3>
            <p className="text-sm text-slate-400">Clicca "Aggiungi GAP" per iniziare.</p>
          </div>
        )}
      </div>
    </div>
  )
}
