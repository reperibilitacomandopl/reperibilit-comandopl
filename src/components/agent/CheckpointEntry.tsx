"use client"

import { useState, useEffect, useCallback } from "react"
import { useTheme } from "@/hooks/useTheme"
import {
  Shield, Plus, Car, Save, CheckCircle, ChevronDown, ChevronUp, MapPin
} from "lucide-react"

type Checkpoint = {
  id: string
  dataControllo: string
  oraInizio: string
  oraFine: string
  luogo: string
  veicoloServizio: string | null
  _count?: { vehicles: number }
  vehicles?: any[]
}

export default function CheckpointEntry() {
  const { isDark } = useTheme()
  const [tab, setTab] = useState<"lista" | "nuovo">("lista")
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  
  // New checkpoint form
  const [newForm, setNewForm] = useState({
    dataControllo: new Date().toISOString().split('T')[0],
    oraInizio: "07:00", oraFine: "13:00", luogo: "", veicoloServizio: "", note: ""
  })

  // New vehicle form
  const [vehicleForm, setVehicleForm] = useState({
    oraControllo: "", targa: "", tipoVeicolo: "AUTOVETTURA", marcaModello: "",
    proprietarioNome: "", proprietarioCognome: "", conducenteStessoProp: true,
    sanzioneElevata: "", sanzioneAccessoria: ""
  })

  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/agent/checkpoints')
      if (res.ok) {
        const data = await res.json()
        setCheckpoints(data.checkpoints || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const createCheckpoint = async () => {
    try {
      const res = await fetch('/api/agent/checkpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newForm)
      })
      if (res.ok) {
        setTab("lista")
        setNewForm({ dataControllo: new Date().toISOString().split('T')[0], oraInizio: "07:00", oraFine: "13:00", luogo: "", veicoloServizio: "", note: "" })
        showToast("Posto di controllo creato con successo")
        fetchData()
      }
    } catch (err) { console.error(err) }
  }

  const expandCheckpoint = async (id: string) => {
    if (expandedId === id) { setExpandedId(null); return }
    try {
      const res = await fetch(`/api/agent/checkpoints/${id}`)
      if (res.ok) {
        const data = await res.json()
        setCheckpoints(prev => prev.map(c => c.id === id ? { ...c, vehicles: data.vehicles } : c))
        setExpandedId(id)
      }
    } catch (err) { console.error(err) }
  }

  const addVehicle = async (checkpointId: string) => {
    if (!vehicleForm.targa) return
    try {
      const res = await fetch(`/api/agent/checkpoints/${checkpointId}/vehicles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vehicleForm)
      })
      if (res.ok) {
        setVehicleForm({ oraControllo: "", targa: "", tipoVeicolo: "AUTOVETTURA", marcaModello: "", proprietarioNome: "", proprietarioCognome: "", conducenteStessoProp: true, sanzioneElevata: "", sanzioneAccessoria: "" })
        showToast("Veicolo aggiunto con successo")
        expandCheckpoint(checkpointId)
        fetchData()
      }
    } catch (err) { console.error(err) }
  }

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso)
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
    } catch { return iso }
  }

  const cardBg = isDark ? "bg-slate-900 border-white/5" : "bg-white border-slate-200"
  const inputBg = isDark ? "bg-slate-950 border-white/10 text-white placeholder-white/30" : "bg-white border-slate-200 text-slate-900 placeholder-slate-400"
  const rowHover = isDark ? "hover:bg-white/5" : "hover:bg-slate-50"
  const mutedText = isDark ? "text-white/40" : "text-slate-400"

  return (
    <div className={`p-4 sm:p-6 max-w-4xl mx-auto space-y-6 ${isDark ? "text-slate-200" : "text-slate-800"}`}>
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Shield size={20} />
            </div>
            Posti di Controllo
          </h1>
          <p className={`text-sm font-medium mt-1 ${mutedText}`}>Inserimento controlli dal campo</p>
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-auto">
          <button onClick={() => setTab("lista")}
            className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${tab === "lista" ? "bg-white dark:bg-slate-600 shadow-sm" : "opacity-60"}`}>
            I Miei Controlli
          </button>
          <button onClick={() => setTab("nuovo")}
            className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${tab === "nuovo" ? "bg-blue-600 text-white shadow-sm" : "opacity-60"}`}>
            <Plus size={14} className="inline mr-1" /> Nuovo
          </button>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-4 right-4 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 font-bold text-sm z-50 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle size={18} /> {toast}
        </div>
      )}

      {/* TAB: LISTA */}
      {tab === "lista" && (
        <div className="space-y-4">
          {loading ? (
            <div className={`p-8 text-center rounded-2xl border ${cardBg}`}>
              <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
              <p className={`text-sm ${mutedText}`}>Caricamento...</p>
            </div>
          ) : checkpoints.length === 0 ? (
            <div className={`p-12 text-center rounded-2xl border ${cardBg}`}>
              <Shield className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="font-bold text-lg">Nessun controllo</p>
              <p className={`text-sm mt-1 ${mutedText}`}>Non hai ancora registrato posti di controllo</p>
              <button onClick={() => setTab("nuovo")} className="mt-6 px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl text-sm">
                Inizia un nuovo controllo
              </button>
            </div>
          ) : checkpoints.map(c => (
            <div key={c.id} className={`rounded-2xl border ${cardBg} overflow-hidden shadow-sm transition-all`}>
              <div className={`p-4 flex items-center justify-between cursor-pointer ${rowHover}`} onClick={() => expandCheckpoint(c.id)}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-black text-lg">{formatDate(c.dataControllo)}</span>
                    <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${isDark ? "bg-white/5" : "bg-slate-100"}`}>{c.oraInizio} - {c.oraFine}</span>
                  </div>
                  <div className={`text-sm font-bold flex items-center gap-1.5 ${mutedText}`}><MapPin size={14} className="text-blue-500" /> {c.luogo}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <span className="block text-xl font-black text-cyan-500">{c._count?.vehicles || 0}</span>
                    <span className="block text-[9px] uppercase tracking-widest opacity-50 font-bold">Veicoli</span>
                  </div>
                  {expandedId === c.id ? <ChevronUp size={20} className="opacity-50" /> : <ChevronDown size={20} className="opacity-50" />}
                </div>
              </div>

              {expandedId === c.id && (
                <div className={`p-4 border-t ${isDark ? "border-white/5 bg-slate-950/40" : "border-slate-200 bg-slate-50"} space-y-6`}>
                  {/* Form Aggiunta Rapida Veicolo */}
                  <div className={`p-4 rounded-xl border ${cardBg} space-y-3`}>
                    <h4 className="text-xs font-black uppercase tracking-widest text-blue-500 flex items-center gap-2 mb-2">
                      <Plus size={14} /> Aggiungi Veicolo Fermato
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <input placeholder="Targa *" value={vehicleForm.targa} onChange={e => setVehicleForm(f => ({...f, targa: e.target.value.toUpperCase()}))} className={`col-span-2 px-3 py-2.5 rounded-xl border text-base font-black tracking-widest ${inputBg}`} />
                      <input placeholder="Ora (HH:MM)" value={vehicleForm.oraControllo} onChange={e => setVehicleForm(f => ({...f, oraControllo: e.target.value}))} className={`px-3 py-2 rounded-xl border text-sm ${inputBg}`} />
                      <input placeholder="Tipo (es. Auto)" value={vehicleForm.tipoVeicolo} onChange={e => setVehicleForm(f => ({...f, tipoVeicolo: e.target.value}))} className={`px-3 py-2 rounded-xl border text-sm ${inputBg}`} />
                      <input placeholder="Cognome Conducente" value={vehicleForm.proprietarioCognome} onChange={e => setVehicleForm(f => ({...f, proprietarioCognome: e.target.value}))} className={`px-3 py-2 rounded-xl border text-sm ${inputBg}`} />
                      <input placeholder="Sanzione (Art.)" value={vehicleForm.sanzioneElevata} onChange={e => setVehicleForm(f => ({...f, sanzioneElevata: e.target.value}))} className={`px-3 py-2 rounded-xl border text-sm ${inputBg}`} />
                    </div>
                    <button onClick={() => addVehicle(c.id)} disabled={!vehicleForm.targa}
                      className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20">
                      <Save size={16} /> Salva Veicolo
                    </button>
                  </div>

                  {/* Veicoli Aggiunti */}
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest opacity-60 flex items-center gap-2 mb-3">
                      <Car size={14} /> Veicoli Registrati ({c.vehicles?.length || 0})
                    </h4>
                    {c.vehicles && c.vehicles.length > 0 ? (
                      <div className="space-y-2">
                        {c.vehicles.map(v => (
                          <div key={v.id} className={`p-3 rounded-xl border ${cardBg} flex justify-between items-center`}>
                            <div>
                              <p className="text-base font-black tracking-widest">{v.targa}</p>
                              <p className="text-xs opacity-60 font-bold">{v.oraControllo || 'Ora non spec.'} • {v.tipoVeicolo || 'Veicolo'} • {v.proprietarioCognome || 'Utente n.d.'}</p>
                            </div>
                            {v.sanzioneElevata && (
                              <span className="px-2 py-1 bg-amber-500/10 text-amber-500 text-[10px] font-bold rounded-lg border border-amber-500/20">Sanzione</span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className={`text-xs text-center py-2 ${mutedText}`}>Nessun veicolo registrato</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* TAB: NUOVO */}
      {tab === "nuovo" && (
        <div className={`rounded-3xl border ${cardBg} p-5 sm:p-6 shadow-sm`}>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest opacity-60 mb-1 block">Data *</label>
              <input type="date" value={newForm.dataControllo} onChange={e => setNewForm(f => ({...f, dataControllo: e.target.value}))} className={`w-full px-4 py-3 rounded-xl border text-sm font-bold ${inputBg}`} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest opacity-60 mb-1 block">Da *</label>
                <input type="time" value={newForm.oraInizio} onChange={e => setNewForm(f => ({...f, oraInizio: e.target.value}))} className={`w-full px-4 py-3 rounded-xl border text-sm font-bold ${inputBg}`} />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest opacity-60 mb-1 block">A *</label>
                <input type="time" value={newForm.oraFine} onChange={e => setNewForm(f => ({...f, oraFine: e.target.value}))} className={`w-full px-4 py-3 rounded-xl border text-sm font-bold ${inputBg}`} />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest opacity-60 mb-1 block">Luogo / Via *</label>
              <input type="text" placeholder="Es. Via Roma, 10" value={newForm.luogo} onChange={e => setNewForm(f => ({...f, luogo: e.target.value}))} className={`w-full px-4 py-3 rounded-xl border text-sm font-bold ${inputBg}`} />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest opacity-60 mb-1 block">Pattuglia / Veicolo</label>
              <input type="text" placeholder="Es. Alfa 01" value={newForm.veicoloServizio} onChange={e => setNewForm(f => ({...f, veicoloServizio: e.target.value}))} className={`w-full px-4 py-3 rounded-xl border text-sm ${inputBg}`} />
            </div>
            <button onClick={createCheckpoint} disabled={!newForm.luogo || !newForm.dataControllo}
              className="w-full mt-4 flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-95">
              <Plus size={18} /> Inizia Controllo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
