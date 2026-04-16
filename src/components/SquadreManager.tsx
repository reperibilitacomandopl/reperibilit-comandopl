"use client"

import { useState, useEffect } from "react"
import { Loader2, Plus, Trash2, Edit3, ChevronLeft, User, Users, Calendar, GripVertical, X, Check, Activity } from "lucide-react"
import toast from "react-hot-toast"
import Link from "next/link"

const DAYS_OF_WEEK = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"]

interface RotationGroup {
  id: string
  name: string
  pattern: string // JSON string
  mStartTime: string
  mEndTime: string
  pStartTime: string
  pEndTime: string
  startDate: string
  users: { id: string; name: string; fixedRestDay: number | null; isActive?: boolean }[]
}

export default function SquadreManager() {
  const [loading, setLoading] = useState(true)
  const [groups, setGroups] = useState<RotationGroup[]>([])
  const [allUsers, setAllUsers] = useState<{ id: string; name: string; isActive?: boolean }[]>([])

  // Creazione nuovo gruppo
  const [showCreate, setShowCreate] = useState(false)
  const [newGroupName, setNewGroupName] = useState("")

  // Editing pattern
  const [editingPatternId, setEditingPatternId] = useState<string | null>(null)
  const [editPattern, setEditPattern] = useState<string[]>([])
  const [editMStart, setEditMStart] = useState("07:00")
  const [editMEnd, setEditMEnd] = useState("13:00")
  const [editPStart, setEditPStart] = useState("13:00")
  const [editPEnd, setEditPEnd] = useState("19:00")
  const [editStartDate, setEditStartDate] = useState(new Date().toISOString().split('T')[0])
  const [editName, setEditName] = useState("")

  const loadData = async () => {
    setLoading(true)
    try {
      const [gRes, uRes] = await Promise.all([
        fetch("/api/admin/rotation-groups"),
        fetch("/api/admin/users")
      ])
      const gData = await gRes.json()
      const uData = await uRes.json()
      if (Array.isArray(gData)) setGroups(gData)
      if (uData.users) setAllUsers(uData.users)
    } catch {
      toast.error("Errore caricamento")
    }
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  // Utenti non ancora assegnati a nessun gruppo (filtra solo gli attivi)
  const assignedUserIds = new Set(groups.flatMap(g => (g.users || []).filter(u => u.isActive !== false).map(u => u.id)))
  const unassignedUsers = allUsers.filter(u => u.isActive !== false && !assignedUserIds.has(u.id))

  // --- CRUD Gruppi ---
  const createGroup = async () => {
    if (!newGroupName.trim()) return
    try {
      const defaultPattern = Array(28).fill("M").map((_, i) => i % 2 === 0 ? "M" : "P")
      const res = await fetch("/api/admin/rotation-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: newGroupName.trim(), 
          pattern: defaultPattern,
          startDate: new Date().toISOString()
        })
      })
      if (!res.ok) throw new Error()
      toast.success(`Turno "${newGroupName}" creato!`)
      setNewGroupName("")
      setShowCreate(false)
      loadData()
    } catch { toast.error("Errore creazione") }
  }

  const deleteGroup = async (id: string) => {
    if (!confirm("Eliminare questo turno? Gli agenti verranno sganciati.")) return
    try {
      await fetch(`/api/admin/rotation-groups?id=${id}`, { method: "DELETE" })
      toast.success("Turno eliminato")
      loadData()
    } catch { toast.error("Errore eliminazione") }
  }

  const savePattern = async () => {
    if (!editingPatternId) return
    try {
      const res = await fetch("/api/admin/rotation-groups", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingPatternId,
          name: editName,
          pattern: editPattern,
          mStartTime: editMStart,
          mEndTime: editMEnd,
          pStartTime: editPStart,
          pEndTime: editPEnd,
          startDate: editStartDate
        })
      })
      if (!res.ok) throw new Error()
      toast.success("Sequenza e orari salvati!")
      setEditingPatternId(null)
      loadData()
    } catch { toast.error("Errore salvataggio: verifica i dati e i permessi") }
  }

  // --- Drag & Drop ---
  const handleDragStart = (e: React.DragEvent, userId: string) => {
    e.dataTransfer.setData("userId", userId)
  }

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault() }

  const handleDropOnGroup = async (e: React.DragEvent, groupId: string) => {
    e.preventDefault()
    const userId = e.dataTransfer.getData("userId")
    if (!userId) return
    try {
      await fetch("/api/admin/users/assign-group", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, rotationGroupId: groupId })
      })
      toast.success("Agente assegnato!")
      loadData()
    } catch { toast.error("Errore assegnazione") }
  }

  const handleDropOnUnassigned = async (e: React.DragEvent) => {
    e.preventDefault()
    const userId = e.dataTransfer.getData("userId")
    if (!userId) return
    try {
      await fetch("/api/admin/users/assign-group", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, rotationGroupId: null })
      })
      toast.success("Agente rimosso dal turno")
      loadData()
    } catch { toast.error("Errore") }
  }

  const setRestDay = async (userId: string, day: number | null) => {
    try {
      await fetch("/api/admin/users/assign-group", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, fixedRestDay: day })
      })
      toast.success("Riposo impostato!")
      loadData()
    } catch { toast.error("Errore") }
  }

  const openPatternEditor = (group: RotationGroup) => {
    setEditingPatternId(group.id)
    try {
      setEditPattern(JSON.parse(group.pattern))
    } catch {
      setEditPattern(Array(28).fill("M").map((_, i) => i % 2 === 0 ? "M" : "P"))
    }
    setEditMStart(group.mStartTime || "07:00")
    setEditMEnd(group.mEndTime || "13:00")
    setEditPStart(group.pStartTime || "13:00")
    setEditPEnd(group.pEndTime || "19:00")
    setEditStartDate(group.startDate ? new Date(group.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0])
    setEditName(group.name)
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-slate-50 items-center justify-center">
        <Loader2 size={40} className="animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 relative animate-in fade-in duration-700">
      {/* Page Header Premium */}
      <div className="bg-slate-900 text-white p-8 flex flex-col sm:flex-row sm:items-center justify-between shrink-0 shadow-2xl z-20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] -mr-48 -mt-48 pointer-events-none"></div>
        
        <div className="flex items-center gap-6 relative z-10">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
             <Users width={28} height={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase leading-none">Gestione <span className="text-blue-400">Squadre</span></h1>
            <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.3em] mt-1">Sentinel Personnel Rotation System</p>
          </div>
        </div>

        <div className="flex items-center gap-4 relative z-10 mt-6 sm:mt-0">
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center gap-3 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
          >
            <Plus size={18} /> Nuovo Turno
          </button>
          <Link href="/" className="px-6 py-4 bg-white/5 hover:bg-white/10 text-white/70 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center gap-3 border border-white/10 transition-all active:scale-95">
            <ChevronLeft size={18} /> Dashboard
          </Link>
        </div>
      </div>

      {/* Creazione rapida nuovo gruppo Premium */}
      {showCreate && (
        <div className="bg-emerald-50 border-b border-emerald-100 p-6 flex items-center gap-4 animate-in slide-in-from-top-4 duration-500">
          <div className="relative flex-1 max-w-md">
            <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400" size={18} />
            <input
              type="text" placeholder="Identificativo Turno (es. ALPHA / BRAVO)"
              value={newGroupName} onChange={e => setNewGroupName(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white border border-emerald-200 rounded-2xl text-sm font-black text-slate-700 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all shadow-sm"
              onKeyDown={e => e.key === "Enter" && createGroup()}
            />
          </div>
          <button onClick={createGroup} className="px-10 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-md active:scale-95">Inizializza</button>
          <button onClick={() => setShowCreate(false)} className="w-12 h-12 flex items-center justify-center bg-white border border-emerald-100 text-emerald-600 hover:bg-emerald-100 rounded-xl transition-all"><X size={20} /></button>
        </div>
      )}

      {/* Body: 2 colonne Premium */}
      <div className="flex-1 flex overflow-hidden p-6 gap-8 bg-slate-50">

        {/* Colonna Sinistra: Personale in Attesa */}
        <div
          className="w-[320px] min-w-[320px] flex flex-col bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden animate-in slide-in-from-left duration-700"
          onDragOver={handleDragOver}
          onDragEnter={handleDragOver}
          onDrop={handleDropOnUnassigned}
        >
          <div className="bg-slate-900 text-white px-8 py-6 font-black flex items-center justify-between shrink-0 text-[10px] uppercase tracking-[0.2em]">
            <div className="flex items-center gap-3">
               <User size={16} className="text-blue-400" />
               <span>Pool Agenti Liberi</span>
            </div>
            <span className="bg-blue-600 px-2 py-0.5 rounded-lg">{unassignedUsers.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-slate-50/30">
            {unassignedUsers.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                 <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4"><Check className="text-slate-300" /></div>
                 <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-relaxed">Tutto il personale è stato assegnato alle unità operative.</p>
              </div>
            )}
            {unassignedUsers.map(u => (
              <div
                key={u.id}
                draggable
                onDragStart={e => handleDragStart(e, u.id)}
                className="group flex items-center gap-4 px-6 py-4 bg-white hover:bg-blue-50 border border-slate-100 rounded-2xl cursor-grab active:cursor-grabbing transition-all hover:shadow-lg hover:border-blue-200"
              >
                <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
                   <GripVertical size={16} />
                </div>
                <div className="flex-1">
                   <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight block">{u.name}</span>
                   <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">In Attesa</span>
                </div>
              </div>
            ))}
          </div>
          <div className="p-6 bg-blue-50 border-t border-blue-100">
             <p className="text-[9px] text-blue-600 font-black uppercase tracking-widest leading-relaxed text-center">
               Trascina un agente su una squadra per assegnarlo alla rotazione.
             </p>
          </div>
        </div>

        {/* Colonna Destra: Hub delle Unità Operative */}
        <div className="flex-1 overflow-y-auto px-2 space-y-8 custom-scrollbar">
          {groups.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-24 h-24 bg-slate-100 rounded-[3rem] flex items-center justify-center mb-6 text-slate-200">
                 <Users size={48} />
              </div>
              <p className="text-2xl font-black text-slate-800 tracking-tighter uppercase">Nessuna unità rilevata</p>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-2">Crea il primo turno per iniziare la distribuzione del personale.</p>
            </div>
          )}

          {groups.map(group => {
            let parsedPattern: string[] = []
            try { parsedPattern = JSON.parse(group.pattern) } catch {}

            return (
              <div
                key={group.id}
                className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden group/card hover:shadow-2xl hover:border-blue-200 transition-all duration-500 animate-in slide-in-from-right duration-700"
                onDragOver={handleDragOver}
                onDragEnter={handleDragOver}
                onDrop={e => handleDropOnGroup(e, group.id)}
              >
                {/* Header Unità Premium */}
                <div className="bg-slate-900 text-white p-6 px-10 flex items-center justify-between relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
                   
                  <div className="flex items-center gap-6 relative z-10">
                    <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center border border-white/10">
                       <span className="text-xl font-black text-blue-400">{group.name[0]}</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-black uppercase tracking-tight">{group.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                         <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-500/20">{group.users.length} Agenti Operativi</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 relative z-10">
                    <button
                      onClick={() => openPatternEditor(group)}
                      className="px-5 py-2.5 bg-white/5 hover:bg-blue-600 text-white/70 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-white/10 transition-all active:scale-95"
                    >
                      <Edit3 size={14} /> Configurazione
                    </button>
                    <button
                      onClick={() => deleteGroup(group.id)}
                      className="w-10 h-10 bg-white/5 hover:bg-rose-600 text-rose-400 hover:text-white rounded-xl flex items-center justify-center border border-white/10 transition-all active:scale-95"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Engine Preview Premium */}
                <div className="bg-slate-50/50 border-b border-slate-100 px-10 py-5 flex items-center gap-3 overflow-x-auto no-scrollbar">
                  <div className="flex items-center gap-1.5 grayscale group-hover/card:grayscale-0 transition-all duration-500">
                    {parsedPattern.slice(0, 14).map((p, i) => {
                      let displayCode = p
                      if (p === "M") {
                        const [h] = (group.mStartTime || "07:00").split(":")
                        displayCode = `M${parseInt(h)}`
                      } else if (p === "P") {
                        const [h] = (group.pStartTime || "13:00").split(":")
                        displayCode = `P${parseInt(h)}`
                      }
                      return (
                        <div key={i} className="flex flex-col items-center gap-1">
                           <span className="text-[7px] font-black text-slate-300 uppercase tracking-tighter">{i+1}</span>
                           <span
                             className={`w-8 h-8 flex items-center justify-center text-[10px] font-black rounded-lg shadow-sm border ${
                               p === "RP" ? "bg-rose-50 text-rose-700 border-rose-100" :
                               p.startsWith("M") || displayCode.startsWith("M") ? "bg-blue-100 text-blue-700 border-blue-100" :
                               p.startsWith("P") || displayCode.startsWith("P") ? "bg-indigo-100 text-indigo-700 border-indigo-100" :
                               "bg-slate-200 text-slate-600 border-slate-300"
                             }`}
                           >
                             {displayCode}
                           </span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="w-px h-10 bg-slate-200 mx-4 shrink-0"></div>
                  <div className="flex gap-4 shrink-0">
                     <div className="bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
                        <p className="text-[8px] font-black text-blue-500 uppercase mb-0.5">Fascia M</p>
                        <p className="text-[11px] font-black text-slate-700">{group.mStartTime || "07:00"}-{group.mEndTime || "13:00"}</p>
                     </div>
                     <div className="bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
                        <p className="text-[8px] font-black text-indigo-500 uppercase mb-0.5">Fascia P</p>
                        <p className="text-[11px] font-black text-slate-700">{group.pStartTime || "13:00"}-{group.pEndTime || "19:00"}</p>
                     </div>
                  </div>
                </div>

                {/* Agenti Dashboard Inside Cards */}
                <div className="p-8 px-10">
                  {group.users.length === 0 && (
                    <div className="py-20 flex flex-col items-center justify-center bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-100">
                       <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Settore Vacante</p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {group.users.map((u, i) => (
                      <div
                        key={u.id}
                        draggable
                        onDragStart={e => handleDragStart(e, u.id)}
                        className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-3xl hover:bg-slate-50 hover:shadow-xl hover:border-blue-200 transition-all group/agent cursor-grab active:cursor-grabbing"
                      >
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover/agent:bg-blue-600 group-hover/agent:text-white transition-all shadow-inner">
                              <User size={18} />
                           </div>
                           <div>
                              <p className="text-sm font-black text-slate-800 uppercase tracking-tight leading-none mb-1">{u.name}</p>
                              <div className="flex items-center gap-2">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Rotazione Attiva</span>
                              </div>
                           </div>
                        </div>
                        <div className="flex items-center gap-4">
                           <div className="relative">
                              <select
                                value={u.fixedRestDay ?? ""}
                                onChange={e => setRestDay(u.id, e.target.value === "" ? null : parseInt(e.target.value))}
                                className="appearance-none pr-8 pl-4 py-2 bg-slate-100/50 border border-slate-200 rounded-xl text-[10px] font-black text-slate-600 uppercase tracking-widest focus:bg-white focus:border-blue-500 transition-all outline-none"
                              >
                                <option value="">Riposo Dinamico</option>
                                {DAYS_OF_WEEK.map((d, idx) => (
                                  <option key={idx} value={idx}>{d}</option>
                                ))}
                              </select>
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                 <Calendar size={12} />
                              </div>
                           </div>
                           <button className="w-8 h-8 flex items-center justify-center text-slate-200 hover:text-rose-500 transition-colors">
                              <GripVertical size={16} />
                           </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

      </div>

      {/* --- MODAL EDITOR PATTERN PREMIUM --- */}
      {editingPatternId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-50 flex items-center justify-center p-6 animate-in fade-in duration-500">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col border border-white/20">
            {/* Modal Header Premium */}
            <div className="bg-slate-900 text-white p-8 px-10 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-6 flex-1">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                   <Calendar width={24} height={24} />
                </div>
                <div className="flex-1 max-w-xl">
                  <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.3em] mb-1">Motore di Pianificazione</p>
                  <input 
                    type="text" 
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xl font-black text-white outline-none focus:border-blue-500 transition-all uppercase tracking-tight"
                    placeholder="Nome Unità"
                  />
                </div>
              </div>
              <button onClick={() => setEditingPatternId(null)} className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-10">
              <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100">
                <p className="text-[11px] font-black text-blue-700 uppercase tracking-widest mb-2 flex items-center gap-2">
                   <Activity size={14} /> Protocollo di Sequenza
                </p>
                <p className="text-sm text-blue-900/60 font-medium leading-relaxed">
                  Definisci il ciclo operativo di 28 giorni (4 settimane). Il sistema calcolerà automaticamente le rotazioni basandosi sulla data di ancoraggio e sugli orari inseriti.
                </p>
              </div>

              {/* ORARI M e P Premium Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm group hover:shadow-xl transition-all">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4">Turno Mattina (M)</p>
                  <div className="flex items-center gap-3">
                    <input type="time" value={editMStart} onChange={e => setEditMStart(e.target.value)} className="flex-1 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black text-slate-700 outline-none focus:border-blue-500" />
                    <span className="text-slate-300">→</span>
                    <input type="time" value={editMEnd} onChange={e => setEditMEnd(e.target.value)} className="flex-1 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black text-slate-700 outline-none focus:border-blue-500" />
                  </div>
                </div>
                <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm group hover:shadow-xl transition-all">
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-4">Turno Pomeriggio (P)</p>
                  <div className="flex items-center gap-3">
                    <input type="time" value={editPStart} onChange={e => setEditPStart(e.target.value)} className="flex-1 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black text-slate-700 outline-none focus:border-indigo-500" />
                    <span className="text-slate-300">→</span>
                    <input type="time" value={editPEnd} onChange={e => setEditPEnd(e.target.value)} className="flex-1 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black text-slate-700 outline-none focus:border-indigo-500" />
                  </div>
                </div>
                <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm group hover:shadow-xl transition-all">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-4">Ancoraggio Giorno 1</p>
                  <input type="date" value={editStartDate} onChange={e => setEditStartDate(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black text-slate-700 outline-none focus:border-emerald-500" />
                </div>
              </div>

              {/* Griglia 4 settimane da 7 giorni ciascuna Premium */}
              <div className="space-y-8">
                {[0, 1, 2, 3].map(week => (
                  <div key={week} className="bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100">
                    <div className="flex items-center gap-4 mb-6">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Week 0{week + 1}</span>
                       <div className="flex-1 h-px bg-slate-200"></div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
                      {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((dayLabel, dayIdx) => {
                        const idx = week * 7 + dayIdx
                        const val = editPattern[idx] || ""
                        return (
                          <div key={idx} className="flex flex-col gap-2">
                            <span className={`text-[10px] font-black uppercase tracking-widest text-center ${dayIdx >= 5 ? 'text-rose-400' : 'text-slate-400'}`}>{dayLabel}</span>
                            <div className="relative">
                               <select
                                 value={val}
                                 onChange={e => {
                                   const next = [...editPattern]
                                   next[idx] = e.target.value
                                   setEditPattern(next)
                                 }}
                                 className={`w-full appearance-none p-4 text-center text-xs font-black rounded-2xl border outline-none transition-all cursor-pointer ${
                                   val === "RP" ? "bg-rose-50 border-rose-100 text-rose-700 hover:bg-rose-100" :
                                   val.startsWith("M") ? "bg-blue-50 border-blue-100 text-blue-700 hover:bg-blue-100" :
                                   val.startsWith("P") ? "bg-indigo-50 border-indigo-100 text-indigo-700 hover:bg-indigo-100" :
                                   "bg-white border-slate-200 text-slate-400"
                                 }`}
                               >
                                 <option value="M">M</option>
                                 <option value="P">P</option>
                                 <option value="RP">RP</option>
                               </select>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-8 px-10 bg-slate-50 border-t border-slate-100 flex justify-end gap-4 shrink-0">
              <button onClick={() => setEditingPatternId(null)} className="px-8 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">Annulla Modifiche</button>
              <button onClick={() => savePattern()} className="px-12 py-4 bg-slate-900 text-white font-black text-[11px] uppercase tracking-widest rounded-2xl shadow-xl shadow-slate-200 hover:bg-black transition-all active:scale-95 flex items-center gap-3">
                <Check size={18} /> Sincronizza Motore
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
