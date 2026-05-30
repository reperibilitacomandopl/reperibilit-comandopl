// @ts-nocheck
"use client"

import { useState, useEffect, useCallback } from "react"
import { CalendarDays, Plus, Trash2, Users, FileText, Pencil, X, Check, Download, Star, Clock, Briefcase, Zap } from "lucide-react"

interface EventAssignment {
  id: string
  userId: string
  timeRange: string
  ordinaryHours: number
  overtimeHours: number
  projectHours: number
  equipment: string | null
  user: { id: string; name: string; squadra: string | null }
}

interface SpecialEvent {
  id: string
  name: string
  description: string | null
  startDate: string
  endDate: string
  ordinanza: string | null
  odsNotes: string | null
  assignments: EventAssignment[]
}

interface Agent {
  id: string
  name: string
  squadra: string | null
}

interface Props {
  tenantSlug: string
  tenantName: string
  logoUrl: string | null
}

export default function EventiManager({ tenantSlug, tenantName, logoUrl }: Props) {
  const [events, setEvents] = useState<SpecialEvent[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editingEvent, setEditingEvent] = useState<SpecialEvent | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<SpecialEvent | null>(null)

  // Form state
  const [formName, setFormName] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formStartDate, setFormStartDate] = useState("")
  const [formEndDate, setFormEndDate] = useState("")
  const [formOrdinanza, setFormOrdinanza] = useState("")
  const [formOdsNotes, setFormOdsNotes] = useState("")
  const [formAssignments, setFormAssignments] = useState<{
    userId: string; serviceType: string; timeRange: string; ordinaryHours: number; overtimeHours: number; projectHours: number
  }[]>([])

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/events")
      if (res.ok) setEvents(await res.json())
    } catch {} finally { setLoading(false) }
  }, [])

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users")
      if (res.ok) {
        const data = await res.json()
        const users = Array.isArray(data) ? data : (data.users || [])
        setAgents(users.map((u: any) => ({ id: u.id, name: u.name, squadra: u.squadra })))
      }
    } catch {}
  }, [])

  useEffect(() => { fetchEvents(); fetchAgents() }, [fetchEvents, fetchAgents])

  const resetForm = () => {
    setFormName(""); setFormDescription(""); setFormStartDate(""); setFormEndDate("")
    setFormOrdinanza(""); setFormOdsNotes(""); setFormAssignments([])
    setShowCreate(false); setEditingEvent(null)
  }

  const openEdit = (ev: SpecialEvent) => {
    setEditingEvent(ev)
    setFormName(ev.name)
    setFormDescription(ev.description || "")
    setFormStartDate(ev.startDate.split("T")[0])
    setFormEndDate(ev.endDate.split("T")[0])
    setFormOrdinanza(ev.ordinanza || "")
    setFormOdsNotes(ev.odsNotes || "")
    setFormAssignments(ev.assignments.map(a => ({
      userId: a.userId, serviceType: a.serviceType || "", timeRange: a.timeRange, ordinaryHours: a.ordinaryHours,
      overtimeHours: a.overtimeHours, projectHours: a.projectHours
    })))
    setShowCreate(true)
  }

  const handleSave = async () => {
    if (!formName || !formStartDate || !formEndDate) return alert("Compila i campi obbligatori.")

    const body = {
      name: formName, description: formDescription, startDate: formStartDate,
      endDate: formEndDate, ordinanza: formOrdinanza, odsNotes: formOdsNotes,
      assignments: formAssignments
    }

    try {
      const url = editingEvent ? `/api/admin/events/${editingEvent.id}` : "/api/admin/events"
      const method = editingEvent ? "PUT" : "POST"
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error("Errore salvataggio")
      resetForm()
      fetchEvents()
    } catch (e: any) { alert(e.message) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Eliminare questo evento speciale?")) return
    try {
      await fetch(`/api/admin/events/${id}`, { method: "DELETE" })
      fetchEvents()
      if (selectedEvent?.id === id) setSelectedEvent(null)
    } catch {}
  }

  const addAssignment = () => {
    setFormAssignments([...formAssignments, { userId: "", serviceType: "Pattuglia", timeRange: "18:00 - 24:00", ordinaryHours: 0, overtimeHours: 0, projectHours: 0 }])
  }

  const removeAssignment = (idx: number) => {
    setFormAssignments(formAssignments.filter((_, i) => i !== idx))
  }

  const updateAssignment = (idx: number, field: string, value: any) => {
    const updated = [...formAssignments]
    updated[idx] = { ...updated[idx], [field]: value }
    setFormAssignments(updated)
  }

  const handleDownloadODS = (ev: SpecialEvent) => {
    window.open(`/api/admin/events/${ev.id}/ods`, "_blank")
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" })

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-900/30">
              <Star size={20} className="text-white" />
            </div>
            Eventi Speciali
          </h1>
          <p className="text-sm text-slate-400 mt-1">ODS personalizzati per eventi, manifestazioni e servizi straordinari</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowCreate(true) }}
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-amber-900/30 transition-all hover:scale-[1.02]"
        >
          <Plus size={16} /> Nuovo Evento
        </button>
      </div>

      {/* Event List */}
      {events.length === 0 && !showCreate ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl">
          <CalendarDays size={48} className="text-slate-600 mb-4" />
          <p className="text-slate-400 font-bold text-sm">Nessun evento speciale in programma</p>
          <p className="text-slate-600 text-xs mt-1">Crea il primo evento per generare un ODS personalizzato</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {events.map(ev => (
            <div
              key={ev.id}
              className={`group relative bg-white/5 backdrop-blur-md border rounded-3xl p-6 transition-all cursor-pointer hover:bg-white/10 hover:border-amber-500/30 ${selectedEvent?.id === ev.id ? "border-amber-500/50 bg-amber-500/5 ring-1 ring-amber-500/20" : "border-white/10"}`}
              onClick={() => setSelectedEvent(selectedEvent?.id === ev.id ? null : ev)}
            >
              {/* Badge Data */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Star size={14} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white tracking-tight uppercase">{ev.name}</h3>
                    {ev.ordinanza && <p className="text-[9px] text-amber-400/60 font-bold uppercase tracking-widest">Ord. {ev.ordinanza}</p>}
                  </div>
                </div>
                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); openEdit(ev) }} className="p-2 bg-white/10 hover:bg-blue-600 text-slate-400 hover:text-white rounded-xl transition-all"><Pencil size={12} /></button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(ev.id) }} className="p-2 bg-white/10 hover:bg-rose-600 text-slate-400 hover:text-white rounded-xl transition-all"><Trash2 size={12} /></button>
                </div>
              </div>

              {ev.description && <p className="text-xs text-slate-400 mb-3 line-clamp-2">{ev.description}</p>}

              <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <span className="flex items-center gap-1"><CalendarDays size={10} /> {formatDate(ev.startDate)} — {formatDate(ev.endDate)}</span>
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
                <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                  <Users size={12} /> {ev.assignments.length} Agenti
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDownloadODS(ev) }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-blue-600 border border-white/10 hover:border-blue-500 text-slate-400 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                >
                  <Download size={10} /> ODS PDF
                </button>
              </div>

              {/* Expanded Detail */}
              {selectedEvent?.id === ev.id && ev.assignments.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/10 space-y-2 animate-in slide-in-from-top-2 duration-300">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Personale Assegnato</p>
                  {ev.assignments.map(a => (
                    <div key={a.id} className="flex items-center justify-between px-3 py-2 bg-white/5 rounded-xl">
                      <span className="text-xs font-bold text-white">{a.user.name}</span>
                      <div className="flex items-center gap-3 text-[9px] font-bold text-slate-400">
                        {a.serviceType && <span className="text-amber-400">{a.serviceType}</span>}
                        <span className="flex items-center gap-1"><Clock size={9} /> {a.timeRange}</span>
                        {a.ordinaryHours > 0 && <span className="text-emerald-400">{a.ordinaryHours}h ord</span>}
                        {a.overtimeHours > 0 && <span className="text-amber-400">{a.overtimeHours}h str</span>}
                        {a.projectHours > 0 && <span className="text-blue-400">{a.projectHours}h prog</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={resetForm}>
          <div className="bg-[#0a0f1a] border border-white/10 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
                  <Star size={14} className="text-white" />
                </div>
                {editingEvent ? "Modifica Evento" : "Nuovo Evento Speciale"}
              </h2>
              <button onClick={resetForm} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white/60 hover:text-white transition-all"><X size={16} /></button>
            </div>

            <div className="p-6 space-y-5">
              {/* Event Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Nome Evento *</label>
                  <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="es. Concerto in Piazza, Consiglio Comunale..."
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-bold placeholder-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Ordinanza / Rif. Normativo</label>
                  <input value={formOrdinanza} onChange={e => setFormOrdinanza(e.target.value)} placeholder="es. Ord. n. 123/2026"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-bold placeholder-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Data Inizio *</label>
                  <input type="date" value={formStartDate} onChange={e => setFormStartDate(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-bold focus:outline-none focus:border-amber-500/50 transition-all" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Data Fine *</label>
                  <input type="date" value={formEndDate} onChange={e => setFormEndDate(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-bold focus:outline-none focus:border-amber-500/50 transition-all" />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Descrizione</label>
                <textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} rows={2} placeholder="Descrizione dell'evento..."
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-bold placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-all resize-none" />
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Note ODS (Verranno stampate nel PDF)</label>
                <textarea value={formOdsNotes} onChange={e => setFormOdsNotes(e.target.value)} rows={2} placeholder="Disposizioni specifiche per il personale..."
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-bold placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-all resize-none" />
              </div>

              {/* Assignments Section */}
              <div className="border-t border-white/10 pt-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-black text-white tracking-tight flex items-center gap-2">
                    <Users size={16} className="text-amber-400" /> Personale Assegnato
                  </h3>
                  <button onClick={addAssignment} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">
                    <Plus size={12} /> Aggiungi
                  </button>
                </div>

                {formAssignments.length === 0 && (
                  <p className="text-center text-slate-600 text-xs py-6">Nessun agente assegnato. Clicca "Aggiungi" per iniziare.</p>
                )}

                <div className="space-y-3">
                  {formAssignments.map((a, idx) => (
                    <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <select
                          value={a.userId}
                          onChange={e => updateAssignment(idx, "userId", e.target.value)}
                          className="flex-1 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-xs font-bold focus:outline-none focus:border-amber-500/50 transition-all"
                        >
                          <option value="">— Seleziona Agente —</option>
                          {agents.map(ag => <option key={ag.id} value={ag.id}>{ag.name}{ag.squadra ? ` (${ag.squadra})` : ""}</option>)}
                        </select>
                        <select
                          value={a.serviceType || "Pattuglia"}
                          onChange={e => updateAssignment(idx, "serviceType", e.target.value)}
                          className="w-40 px-2 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-xs font-bold focus:outline-none focus:border-amber-500/50 transition-all"
                        >
                          <option value="Pattuglia">Pattuglia</option>
                          <option value="Viabilità">Viabilità</option>
                          <option value="Presidio Fisso">Presidio Fisso</option>
                          <option value="Antinfortunistica">Antinfortunistica</option>
                          <option value="Rappresentanza">Rappresentanza</option>
                          <option value="Polizia Giudiziaria">Polizia Giudiziaria</option>
                          <option value="Altro">Altro</option>
                        </select>
                        <input value={a.timeRange} onChange={e => updateAssignment(idx, "timeRange", e.target.value)} placeholder="18:00 - 24:00"
                          className="w-36 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-xs font-bold text-center focus:outline-none focus:border-amber-500/50 transition-all" />
                        <button onClick={() => removeAssignment(idx)} className="p-2 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-xl transition-all"><Trash2 size={12} /></button>
                      </div>

                      {/* Hours Breakdown */}
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-[8px] font-black text-emerald-400/60 uppercase tracking-widest mb-1 block flex items-center gap-1"><Briefcase size={8} /> Ore Ordinarie</label>
                          <input type="number" step="0.5" min="0" value={a.ordinaryHours} onChange={e => updateAssignment(idx, "ordinaryHours", parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-xs font-bold text-center focus:outline-none focus:border-emerald-500/50 transition-all" />
                        </div>
                        <div>
                          <label className="text-[8px] font-black text-amber-400/60 uppercase tracking-widest mb-1 block flex items-center gap-1"><Zap size={8} /> Straordinario</label>
                          <input type="number" step="0.5" min="0" value={a.overtimeHours} onChange={e => updateAssignment(idx, "overtimeHours", parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-xs font-bold text-center focus:outline-none focus:border-amber-500/50 transition-all" />
                        </div>
                        <div>
                          <label className="text-[8px] font-black text-blue-400/60 uppercase tracking-widest mb-1 block flex items-center gap-1"><FileText size={8} /> Progetto / Terzi</label>
                          <input type="number" step="0.5" min="0" value={a.projectHours} onChange={e => updateAssignment(idx, "projectHours", parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-xs font-bold text-center focus:outline-none focus:border-blue-500/50 transition-all" />
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/5 flex items-center justify-end gap-3">
              <button onClick={resetForm} className="px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all">Annulla</button>
              <button onClick={handleSave} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-amber-900/30 transition-all hover:scale-[1.02]">
                <Check size={14} /> {editingEvent ? "Aggiorna" : "Crea Evento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
