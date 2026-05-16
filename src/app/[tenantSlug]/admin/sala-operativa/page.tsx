"use client"

import { useState, useEffect, useMemo } from "react"
import dynamic from "next/dynamic"
import { useSession } from "next-auth/react"
import { Shield, Plus, Clock, MapPin, Phone, User, X, Send, CheckCircle, XCircle, Car, RadioTower, Crosshair } from "lucide-react"
import toast from "react-hot-toast"
import { STRADE_ALTAMURA } from "@/data/strade-altamura"

const LiveMap = dynamic(() => import("@/components/admin/LiveMap"), {
  ssr: false,
  loading: () => <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-400">Caricamento Mappa...</div>
})

const STATUS_LABELS: Record<string, string> = {
  PENDING: "In Attesa",
  DISPATCHED: "Inviato",
  ACCEPTED: "Accettato",
  ON_SITE: "Sul Posto",
  COMPLETED: "Completato",
  CANCELED: "Annullato"
}

const PRIORITY_LABELS: Record<string, string> = {
  RED: "🔴 Emergenza",
  YELLOW: "🟡 Urgente",
  GREEN: "🟢 Ordinario"
}

export default function CentraleOperativa() {
  const { data: session } = useSession()
  const [patrols, setPatrols] = useState<any[]>([])
  const [interventions, setInterventions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewModal, setShowNewModal] = useState(false)
  const [hqCenter, setHqCenter] = useState<[number, number]>([40.8286, 16.5518])
  const [submitting, setSubmitting] = useState(false)
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIntervention, setSelectedIntervention] = useState<any>(null)
  
  const [form, setForm] = useState({
    type: "INCIDENTE", priority: "YELLOW", address: "",
    description: "", callerName: "", callerPhone: "", assignedToId: ""
  })

  // Raggruppa pattuglie per veicolo o servizio
  const groupedPatrols = useMemo(() => {
    const groups: any[] = []
    const processedIds = new Set()

    patrols.forEach(p => {
      if (processedIds.has(p.userId)) return
      
      const groupKey = p.patrolGroupId || p.vehicle || (p.serviceCategory ? `${p.serviceCategory}-${p.timeRange}` : null)
      
      if (groupKey) {
        const members = patrols.filter(x => 
          (x.patrolGroupId && x.patrolGroupId === p.patrolGroupId) ||
          (x.vehicle && x.vehicle === p.vehicle) ||
          (!x.vehicle && !x.patrolGroupId && x.serviceCategory === p.serviceCategory && x.timeRange === p.timeRange)
        )
        members.forEach(m => processedIds.add(m.userId))
        groups.push({
          id: groupKey,
          title: p.vehicle ? `Pattuglia ${p.vehicle}` : p.serviceCategory || "Pattuglia",
          service: p.serviceCategory ? `${p.serviceCategory} ${p.serviceType ? '- '+p.serviceType : ''}` : p.shiftType,
          timeRange: p.timeRange,
          vehicle: p.vehicle,
          radio: p.radio,
          members
        })
      } else {
        processedIds.add(p.userId)
        groups.push({
          id: `usr-${p.userId}`,
          title: `Agente ${p.name}`,
          service: 'N/A',
          timeRange: p.timeRange,
          vehicle: null,
          radio: p.radio,
          members: [p]
        })
      }
    })
    return groups
  }, [patrols])

  const fetchData = async () => {
    try {
      const res = await fetch("/api/admin/live-map")
      if (res.ok) {
        const data = await res.json()
        setPatrols(data.patrols || [])
        setInterventions(data.interventions || [])
        if (data.hq?.lat && data.hq?.lng) setHqCenter([data.hq.lat, data.hq.lng])
      }
    } catch (error) {
      console.error("Fetch live map error", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const lat = 40.8286 + (Math.random() - 0.5) * 0.02
    const lng = 16.5518 + (Math.random() - 0.5) * 0.02
    try {
      const res = await fetch("/api/admin/interventions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, lat, lng, assignedToId: form.assignedToId || undefined })
      })
      if (res.ok) {
        toast.success("Intervento creato con successo")
        setShowNewModal(false)
        setForm({ type: "INCIDENTE", priority: "YELLOW", address: "", description: "", callerName: "", callerPhone: "", assignedToId: "" })
        fetchData()
      } else { toast.error("Errore creazione") }
    } catch { toast.error("Errore di rete") }
    setSubmitting(false)
  }

  const handleAssign = async (interventionId: string, assignedToId: string) => {
    try {
      const res = await fetch("/api/admin/interventions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: interventionId, assignedToId })
      })
      if (res.ok) { toast.success("Pattuglia assegnata"); fetchData() }
      else { toast.error("Errore assegnazione") }
    } catch { toast.error("Errore di rete") }
  }

  const handleClose = async (id: string) => {
    if (!confirm("Chiudere questo intervento?")) return
    try {
      const res = await fetch("/api/admin/interventions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "COMPLETED" })
      })
      if (res.ok) { toast.success("Intervento chiuso"); fetchData(); setSelectedIntervention(null) }
    } catch { toast.error("Errore") }
  }

  const handleReopen = async (id: string) => {
    try {
      const res = await fetch("/api/admin/interventions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "DISPATCHED" })
      })
      if (res.ok) { toast.success("Intervento riaperto"); fetchData(); setSelectedIntervention(null) }
    } catch { toast.error("Errore") }
  }

  const handleUpdateIntervention = async (id: string, updates: any) => {
    try {
      const res = await fetch("/api/admin/interventions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates })
      })
      if (res.ok) { toast.success("Aggiornato"); fetchData(); setSelectedIntervention(null) }
      else { toast.error("Errore aggiornamento") }
    } catch { toast.error("Errore") }
  }

  if (!session) return null

  const now = new Date()

  return (
    <div className="flex h-screen bg-slate-900 overflow-hidden">
      {/* === SIDEBAR === */}
      <div className="w-[340px] flex flex-col bg-slate-900 border-r border-slate-700 z-10">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-blue-900 to-slate-900 flex justify-between items-center border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
            <div>
              <h2 className="font-bold text-white text-sm">Centrale Operativa</h2>
              <p className="text-[10px] text-blue-300 font-mono">{now.toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })} — {now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
          <button onClick={() => setShowNewModal(true)} className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors" title="Nuovo Intervento">
            <Plus className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Interventi */}
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Interventi Attivi ({interventions.length})</h3>
          
          {interventions.length === 0 && (
            <div className="text-center text-slate-600 py-6 text-xs">Nessun intervento in corso</div>
          )}

          {interventions.map(i => (
            <div key={i.id} onClick={() => setSelectedIntervention(i)} className={`p-3 rounded-lg border-l-4 bg-slate-800 shadow text-sm cursor-pointer hover:bg-slate-750 transition-colors ${
              i.priority === 'RED' ? 'border-red-500' : i.priority === 'YELLOW' ? 'border-yellow-500' : 'border-green-500'
            }`}>
              <div className="flex justify-between items-start mb-1">
                <span className="font-bold text-white text-xs">{i.type}</span>
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3"/>
                  {new Date(i.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
              <p className="text-slate-400 text-[11px] truncate flex items-center gap-1"><MapPin className="w-3 h-3 shrink-0"/>{i.address}</p>
              
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  i.status === 'PENDING' ? 'bg-slate-700 text-slate-300' :
                  i.status === 'DISPATCHED' ? 'bg-blue-900 text-blue-300' :
                  i.status === 'ACCEPTED' ? 'bg-purple-900 text-purple-300' :
                  i.status === 'ON_SITE' ? 'bg-yellow-900 text-yellow-300' :
                  'bg-green-900 text-green-300'
                }`}>{STATUS_LABELS[i.status] || i.status}</span>

                {i.assignedToId ? (() => {
                  const patrol = groupedPatrols.find(g => g.members.some((m: any) => m.userId === i.assignedToId))
                  if (patrol) {
                    return <span className="text-[10px] text-blue-400 font-medium truncate max-w-[200px]">{patrol.title} — {patrol.members.map((m: any) => m.name?.split(' ')[0] || 'Agente').join(', ')}</span>
                  }
                  return <span className="text-[10px] text-blue-400">{i.assignedTo?.name || "Assegnato"}</span>
                })() : (
                  <span className="text-[10px] text-red-400 animate-pulse">Non assegnato</span>
                )}
              </div>
            </div>
          ))}

          {/* Pattuglie Raggruppate */}
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-4">Pattuglie in Servizio ({groupedPatrols.length})</h3>
          {groupedPatrols.length === 0 && (
            <div className="text-center text-slate-600 py-4 text-xs">Nessun agente timbrato IN</div>
          )}
          {groupedPatrols.map(g => (
            <div key={g.id} className="p-3 bg-slate-800 rounded-lg border border-slate-700 text-xs">
              <div className="flex justify-between items-start mb-2 pb-2 border-b border-slate-700">
                <div>
                  <p className="font-bold text-white text-sm">{g.title}</p>
                  <p className="text-[10px] text-slate-400">{g.service}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {g.timeRange && <p className="text-[10px] text-slate-500">⏰ {g.timeRange}</p>}
                  <div className="flex gap-2 text-slate-400">
                    {g.vehicle && <Car className="w-3.5 h-3.5 text-blue-400"/>}
                    {g.radio && <RadioTower className="w-3.5 h-3.5 text-green-400"/>}
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                {g.members.map((m: any) => (
                  <div key={m.userId} className="flex justify-between items-center bg-slate-900 p-1.5 rounded">
                    <p className="text-slate-300 font-medium text-[11px]">{m.name} <span className="text-slate-500 font-normal">({m.matricola})</span></p>
                    <div className={`w-2 h-2 rounded-full ${m.lat ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`} title={m.lat ? 'GPS Attivo' : 'GPS N/D'}/>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* === MAPPA === */}
      <div className="flex-1 relative">
        {!loading && <LiveMap patrols={patrols} interventions={interventions} onAssign={handleAssign} center={hqCenter} />}
      </div>

      {/* === MODALE NUOVO INTERVENTO === */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-blue-600 to-blue-800 flex justify-between items-center">
              <div>
                <h2 className="font-bold text-white text-lg">Nuovo Intervento</h2>
                <p className="text-blue-200 text-xs">{now.toLocaleString('it-IT')}</p>
              </div>
              <button onClick={() => setShowNewModal(false)} className="p-1 hover:bg-white/20 rounded-lg transition"><X className="w-5 h-5 text-white"/></button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Tipologia</label>
                  <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="INCIDENTE">🚗 Incidente Stradale</option>
                    <option value="VIABILITA">🚧 Viabilità</option>
                    <option value="LITE">⚠️ Lite / Rissa</option>
                    <option value="CONTROLLO">🔍 Controllo Territorio</option>
                    <option value="SEGNALAZIONE">📞 Segnalazione Cittadino</option>
                    <option value="ALTRO">📋 Altro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Priorità</label>
                  <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="RED">🔴 Codice Rosso (Emergenza)</option>
                    <option value="YELLOW">🟡 Codice Giallo (Urgente)</option>
                    <option value="GREEN">🟢 Codice Verde (Differibile)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Indirizzo / Luogo</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400"/>
                  <input required value={form.address} 
                    onChange={e => {
                      const val = e.target.value
                      setForm({...form, address: val})
                      if (val.length >= 2) {
                        const matches = STRADE_ALTAMURA.filter(s => s.toLowerCase().includes(val.toLowerCase())).slice(0, 6)
                        setAddressSuggestions(matches)
                        setShowSuggestions(matches.length > 0)
                      } else {
                        setShowSuggestions(false)
                      }
                    }}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    className="w-full border border-gray-200 rounded-lg p-2.5 pl-9 text-sm focus:ring-2 focus:ring-blue-500" 
                    placeholder="Es. Via Bari 12, Altamura"
                    autoComplete="off"
                  />
                  {showSuggestions && addressSuggestions.length > 0 && (
                    <div className="absolute z-50 top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                      {addressSuggestions.map((s, idx) => (
                        <button key={idx} type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b border-gray-50 last:border-0"
                          onMouseDown={() => { setForm({...form, address: s}); setShowSuggestions(false) }}
                        >{s}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Descrizione</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500" rows={2} placeholder="Dettagli dell'intervento..."/>
              </div>
              {/* Dati Richiedente per Accesso agli Atti */}
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Dati Richiedente (Accesso agli Atti)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400"/>
                    <input value={form.callerName} onChange={e => setForm({...form, callerName: e.target.value})} className="w-full border border-gray-200 rounded-lg p-2 pl-8 text-sm" placeholder="Nome e Cognome"/>
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400"/>
                    <input value={form.callerPhone} onChange={e => setForm({...form, callerPhone: e.target.value})} className="w-full border border-gray-200 rounded-lg p-2 pl-8 text-sm" placeholder="Telefono"/>
                  </div>
                </div>
              </div>
              {/* Assegnazione diretta */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Assegna Pattuglia (Opzionale)</label>
                  <select value={form.assignedToId} onChange={e => setForm({...form, assignedToId: e.target.value})} className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500">
                    <option value="">— Assegna dopo —</option>
                    {groupedPatrols.map(g => (
                      <option key={g.members[0].userId} value={g.members[0].userId}>
                        {g.title} — {g.members.map((m: any) => m.name?.split(' ')[0] || 'Agente').join(', ')}
                      </option>
                    ))}
                  </select>
              </div>
              <div className="pt-3 border-t flex justify-end gap-3">
                <button type="button" onClick={() => setShowNewModal(false)} className="px-5 py-2.5 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium">Annulla</button>
                <button type="submit" disabled={submitting} className="px-5 py-2.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-lg font-bold flex items-center gap-2 disabled:opacity-50">
                  <Send className="w-4 h-4"/> {submitting ? 'Invio...' : 'Crea Intervento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* === MODALE DETTAGLIO/MODIFICA INTERVENTO === */}
      {selectedIntervention && (() => {
        const i = selectedIntervention
        return (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
              <div className={`p-5 flex justify-between items-start ${
                i.priority === 'RED' ? 'bg-gradient-to-r from-red-600 to-red-800' :
                i.priority === 'YELLOW' ? 'bg-gradient-to-r from-yellow-600 to-yellow-800' :
                'bg-gradient-to-r from-green-600 to-green-800'
              }`}>
                <div>
                  <h2 className="font-bold text-white text-lg">{i.type}</h2>
                  <p className="text-white/70 text-xs mt-1">{PRIORITY_LABELS[i.priority]} — {STATUS_LABELS[i.status] || i.status}</p>
                  <p className="text-white/50 text-[10px] mt-1">ID: {i.id.slice(0,8)}... • Creato: {new Date(i.createdAt).toLocaleString('it-IT')}</p>
                </div>
                <button onClick={() => setSelectedIntervention(null)} className="p-1 hover:bg-white/20 rounded-lg transition"><X className="w-5 h-5 text-white"/></button>
              </div>

              <div className="p-5 space-y-4">
                {/* Indirizzo */}
                <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg border">
                  <MapPin className="w-4 h-4 text-blue-500 mt-0.5 shrink-0"/>
                  <p className="text-sm font-medium text-slate-700">{i.address}</p>
                </div>

                {/* Descrizione */}
                {i.description && (
                  <div className="p-3 bg-gray-50 rounded-lg border text-sm text-slate-600">{i.description}</div>
                )}

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Richiedente</p>
                    <p className="text-slate-700">{i.callerName || 'N/D'}</p>
                    {i.callerPhone && <p className="text-slate-500 text-xs flex items-center gap-1"><Phone className="w-3 h-3"/>{i.callerPhone}</p>}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Cronologia</p>
                    <div className="text-xs text-slate-600 space-y-0.5">
                      <p>📨 {new Date(i.createdAt).toLocaleTimeString('it-IT')}</p>
                      {i.dispatchedAt && <p>📤 Inviato: {new Date(i.dispatchedAt).toLocaleTimeString('it-IT')}</p>}
                      {i.acceptedAt && <p>✅ Accettato: {new Date(i.acceptedAt).toLocaleTimeString('it-IT')}</p>}
                      {i.arrivedAt && <p>📍 Arrivo: {new Date(i.arrivedAt).toLocaleTimeString('it-IT')}</p>}
                      {i.completedAt && <p>🏁 Chiuso: {new Date(i.completedAt).toLocaleTimeString('it-IT')}</p>}
                    </div>
                  </div>
                </div>

                {/* Esito */}
                {i.outcome && (
                  <div className={`p-3 rounded-lg border text-sm font-medium ${
                    i.outcome === 'POSITIVO' ? 'bg-green-50 text-green-700 border-green-200' :
                    i.outcome === 'NEGATIVO' ? 'bg-red-50 text-red-700 border-red-200' :
                    'bg-gray-50 text-gray-700 border-gray-200'
                  }`}>
                    Esito: {i.outcome} {i.outcomeNotes && `— ${i.outcomeNotes}`}
                  </div>
                )}

                {/* Assegnazione */}
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Assegna / Riassegna Pattuglia</p>
                  <select 
                    defaultValue={(() => {
                      const patrol = groupedPatrols.find(g => g.members.some((m: any) => m.userId === i.assignedToId))
                      return patrol ? patrol.members[0].userId : (i.assignedToId || "")
                    })()} 
                    onChange={e => { if (e.target.value) handleAssign(i.id, e.target.value) }}
                    className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500">
                    <option value="" disabled>— Seleziona pattuglia —</option>
                    {groupedPatrols.map(g => (
                      <option key={g.members[0].userId} value={g.members[0].userId}>
                        {g.title} — {g.members.map((m: any) => m.name?.split(' ')[0] || 'Agente').join(', ')}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Note */}
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Note Operative</p>
                  <textarea defaultValue={i.notes || ""} id={`notes-${i.id}`} className="w-full border rounded-lg p-2.5 text-sm" rows={2} placeholder="Aggiungi note..."/>
                </div>

                {/* Esito dalla Centrale */}
                {!i.outcome && i.status === 'ON_SITE' && (
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Imposta Esito dalla Centrale</p>
                    <div className="grid grid-cols-3 gap-2">
                      <button onClick={() => handleUpdateIntervention(i.id, { outcome: 'POSITIVO', status: 'COMPLETED' })} className="py-2 bg-green-500 text-white rounded-lg text-xs font-bold">✅ Positivo</button>
                      <button onClick={() => handleUpdateIntervention(i.id, { outcome: 'NEGATIVO', status: 'COMPLETED' })} className="py-2 bg-red-500 text-white rounded-lg text-xs font-bold">❌ Negativo</button>
                      <button onClick={() => handleUpdateIntervention(i.id, { outcome: 'INFONDATO', status: 'COMPLETED' })} className="py-2 bg-gray-500 text-white rounded-lg text-xs font-bold">⚪ Infondato</button>
                    </div>
                  </div>
                )}

                {/* Azioni */}
                <div className="pt-3 border-t flex gap-2 flex-wrap">
                  <button onClick={() => {
                    const notes = (document.getElementById(`notes-${i.id}`) as HTMLTextAreaElement)?.value
                    handleUpdateIntervention(i.id, { notes })
                  }} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">💾 Salva Note</button>

                  {i.status !== 'COMPLETED' && i.status !== 'CANCELED' && (
                    <button onClick={() => handleClose(i.id)} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium">🛑 Chiudi</button>
                  )}

                  {(i.status === 'COMPLETED' || i.status === 'CANCELED') && (
                    <button onClick={() => handleReopen(i.id)} className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium">🔄 Riapri</button>
                  )}

                  <button onClick={() => setSelectedIntervention(null)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium ml-auto">Chiudi</button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
