"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { Users, Plus, Trash2, Search } from "lucide-react"

interface AnagraficaPanelProps {
  agents: {
    id: string; name: string; matricola: string; isUfficiale: boolean; isActive: boolean;
    email: string | null; phone: string | null; qualifica: string | null;
    gradoLivello: number; squadra: string | null; servizio: string | null; massimale: number;
    defaultServiceCategoryId?: string | null; defaultServiceTypeId?: string | null;
    rotationGroupId?: string | null;
    rotationGroup?: { id: string; name: string } | null;
  }[]
  rotationGroups: { id: string; name: string }[]
  categories: { id: string; name: string; types: { id: string; name: string }[] }[]
}

export default function AnagraficaPanel({ agents, rotationGroups, categories }: AnagraficaPanelProps) {
  const router = useRouter()

  // Filters
  const [searchQuery, setSearchQuery] = useState("")
  const [squadraFilter, setSquadraFilter] = useState("ALL")
  const [qualificaFilter, setQualificaFilter] = useState("ALL")
  const [showArchived, setShowArchived] = useState(false)

  // Edit state
  const [editingAgent, setEditingAgent] = useState<string | null>(null)
  const [tempName, setTempName] = useState("")
  const [tempMatricola, setTempMatricola] = useState("")
  const [tempSquadra, setTempSquadra] = useState("")
  const [tempServizio, setTempServizio] = useState("")
  const [tempRotationGroup, setTempRotationGroup] = useState("")
  const [tempDefaultCategoryId, setTempDefaultCategoryId] = useState("")
  const [tempDefaultTypeId, setTempDefaultTypeId] = useState("")
  const [tempMassimale, setTempMassimale] = useState(8)
  const [tempEmail, setTempEmail] = useState("")
  const [tempPhone, setTempPhone] = useState("")
  const [newPass, setNewPass] = useState("")

  // Add user state
  const [showAddUser, setShowAddUser] = useState(false)
  const [isSavingUser, setIsSavingUser] = useState(false)

  const uniqueSquadre = useMemo(() => [...new Set(agents.map(a => a.rotationGroup?.name || a.squadra || "Senza Squadra"))].sort(), [agents])
  const uniqueQualifiche = useMemo(() => [...new Set(agents.map(a => a.qualifica || "Agente").filter(Boolean))].sort(), [agents])

  const filteredAgents = useMemo(() => {
    return agents.filter(a => {
      if (a.isActive === showArchived) return false // Se mostro archiviati, escludo i non archiviati e viceversa
      if (searchQuery && !a.name.toLowerCase().includes(searchQuery.toLowerCase()) && !a.matricola.includes(searchQuery)) return false
      if (squadraFilter !== "ALL") {
        const agentSquadra = a.rotationGroup?.name || a.squadra || "Senza Squadra"
        if (agentSquadra !== squadraFilter) return false
      }
      if (qualificaFilter !== "ALL" && (a.qualifica || "Agente") !== qualificaFilter) return false
      return true
    })
  }, [agents, searchQuery, squadraFilter, qualificaFilter, showArchived])

  const startEdit = (agent: AnagraficaPanelProps["agents"][number]) => {
    setEditingAgent(agent.id)
    setTempName(agent.name)
    setTempMatricola(agent.matricola)
    setTempSquadra(agent.squadra || "")
    setTempServizio(agent.servizio || "")
    setTempRotationGroup(agent.rotationGroupId || "")
    setTempDefaultCategoryId(agent.defaultServiceCategoryId || "")
    setTempDefaultTypeId(agent.defaultServiceTypeId || "")
    setTempMassimale(agent.massimale)
    setTempEmail(agent.email || "")
    setTempPhone(agent.phone || "")
    setNewPass("")
  }

  const saveEdit = async (agentId: string) => {
    const res = await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: agentId,
        name: tempName,
        matricola: tempMatricola,
        squadra: tempSquadra,
        servizio: tempServizio,
        rotationGroupId: tempRotationGroup || null,
        defaultServiceCategoryId: tempDefaultCategoryId || null,
        defaultServiceTypeId: tempDefaultTypeId || null,
        massimale: tempMassimale,
        email: tempEmail,
        phone: tempPhone,
      }),
    })
    if (res.ok) {
      setEditingAgent(null)
      router.refresh()
      toast.success("Agente aggiornato!")
    } else {
      toast.error("Errore durante il salvataggio")
    }
  }

  const deleteAgent = async (agent: { id: string; name: string }) => {
    if (!confirm(`⚠️ Vuoi davvero eliminare l'agente ${agent.name}?\n\nL'operazione è irreversibile e l'agente verrà disattivato dal sistema.`)) return
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: agent.id }),
      })
      if (res.ok) {
        toast.success(`${agent.name} eliminato con successo`)
        // Forza un reload completo della pagina per riflettere la cancellazione
        window.location.reload()
      } else {
        const data = await res.json()
        toast.error(data.error || "Errore durante l'eliminazione")
      }
    } catch (err) {
      toast.error("Errore di connessione")
    }
  }

  const restoreAgent = async (agent: { id: string; name: string }) => {
    if (!confirm(`Vuoi ripristinare l'agente ${agent.name} nell'organico attivo?`)) return
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: agent.id, action: "restore" }),
      })
      if (res.ok) {
        toast.success(`${agent.name} ripristinato con successo`)
        window.location.reload()
      } else {
        const data = await res.json()
        toast.error(data.error || "Errore durante il ripristino")
      }
    } catch (err) {
      toast.error("Errore di connessione")
    }
  }

  const addUser = async () => {
    setIsSavingUser(true)
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matricola: tempMatricola, name: tempName, squadra: tempSquadra, massimale: tempMassimale, password: newPass }),
    })
    if (res.ok) {
      setShowAddUser(false)
      setTempMatricola(""); setTempName(""); setTempSquadra(""); setNewPass("")
      router.refresh()
      toast.success("Nuovo dipendente creato!")
    } else {
      const d = await res.json()
      toast.error(d.error || "Errore creazione")
    }
    setIsSavingUser(false)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Anagrafica Personale</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            {agents.length} dipendenti registrati nel sistema
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border ${showArchived ? "bg-slate-900 text-white border-slate-900 shadow-lg" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`}
          >
            {showArchived ? "Torna all'Anagrafica" : "Vedi Archivio"}
          </button>
          <button
            onClick={() => { setShowAddUser(!showAddUser); setTempMatricola(""); setTempName(""); setTempSquadra(""); setNewPass(""); setTempMassimale(8) }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm transition-all shadow-sm ${showAddUser ? "text-slate-600 bg-slate-200 border border-slate-300" : "text-white bg-blue-600 hover:bg-blue-700 shadow-blue-200"}`}
          >
            <Plus size={18} /> {showAddUser ? "Chiudi" : "Nuovo Dipendente"}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cerca per nome o matricola..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>
        <select value={squadraFilter} onChange={e => setSquadraFilter(e.target.value)} className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl font-semibold bg-white focus:outline-none focus:border-blue-400">
          <option value="ALL">Tutte le Squadre</option>
          {uniqueSquadre.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={qualificaFilter} onChange={e => setQualificaFilter(e.target.value)} className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl font-semibold bg-white focus:outline-none focus:border-blue-400">
          <option value="ALL">Tutte le Qualifiche</option>
          {uniqueQualifiche.map(q => <option key={q} value={q}>{q}</option>)}
        </select>
        <span className="text-xs font-bold text-slate-600 ml-auto">
          {filteredAgents.length} risultati
        </span>
      </div>

      {/* Add User Form */}
      {showAddUser && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 shadow-sm animate-in fade-in slide-in-from-top-2">
          <h3 className="text-sm font-black text-blue-800 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Users size={16} /> Nuovo Dipendente
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-[10px] font-black text-blue-700 uppercase mb-1">Matricola</label>
              <input type="text" placeholder="Es. 123" value={tempMatricola} onChange={e => setTempMatricola(e.target.value.toUpperCase())} className="w-full border-2 border-blue-300 rounded-lg px-3 py-2 text-sm font-black focus:border-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-blue-700 uppercase mb-1">Nome Completo</label>
              <input type="text" placeholder="COGNOME NOME" value={tempName} onChange={e => setTempName(e.target.value.toUpperCase())} className="w-full border-2 border-blue-300 rounded-lg px-3 py-2 text-sm font-black focus:border-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-blue-700 uppercase mb-1">Squadra</label>
              <input type="text" placeholder="Es. SQUADRA A" value={tempSquadra} onChange={e => setTempSquadra(e.target.value.toUpperCase())} className="w-full border-2 border-blue-300 rounded-lg px-3 py-2 text-sm font-black focus:border-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-blue-700 uppercase mb-1">Max REP</label>
              <input type="number" value={tempMassimale} onChange={e => setTempMassimale(parseInt(e.target.value))} className="w-full border-2 border-blue-300 rounded-lg px-3 py-2 text-sm font-black focus:border-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-blue-700 uppercase mb-1">Password</label>
              <input type="password" placeholder="Min. 6 car." value={newPass} onChange={e => setNewPass(e.target.value)} className="w-full border-2 border-blue-300 rounded-lg px-3 py-2 text-sm font-black focus:border-blue-500 outline-none" />
            </div>
            <div className="flex items-end">
              <button
                disabled={isSavingUser || !tempMatricola || !tempName || !newPass}
                onClick={addUser}
                className="w-full bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-black hover:bg-black transition-all shadow-md disabled:opacity-50"
              >
                CREA ORA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Agents Table */}
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap min-w-[1100px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Matr.</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Operatore</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Assegnazione</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Qualifica</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Target REP</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contatti</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Gestione</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredAgents.map(agent => {
                const isEditing = editingAgent === agent.id;
                const initials = agent.name.split(' ').map(n => n.charAt(0)).join('').substring(0,2) || 'AG';
                return (
                <tr key={agent.id} className={`${isEditing ? "bg-slate-50/90 shadow-inner" : "hover:bg-slate-50"} transition-all group`}>
                  {/* Matricola */}
                  <td className="px-6 py-4">
                    {isEditing ? (
                      <input type="text" value={tempMatricola} onChange={e => setTempMatricola(e.target.value.toUpperCase())} className="border-2 border-slate-200 rounded-xl px-3 py-2 w-24 text-sm font-black outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 bg-white text-slate-800 transition-all" />
                    ) : (
                      <div className="bg-slate-100 text-slate-500 font-mono font-black text-[11px] px-2.5 py-1 rounded inline-block uppercase tracking-widest">{agent.matricola}</div>
                    )}
                  </td>

                  {/* Nome */}
                  <td className="px-6 py-4">
                    {isEditing ? (
                      <input type="text" value={tempName} onChange={e => setTempName(e.target.value.toUpperCase())} className="border-2 border-slate-200 rounded-xl px-3 py-2 w-56 text-sm font-black outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 bg-white text-slate-800 transition-all" />
                    ) : (
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 shrink-0 rounded-[1rem] flex items-center justify-center text-white text-[11px] font-black uppercase tracking-wider shadow-md ${agent.isUfficiale ? 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-indigo-200' : 'bg-gradient-to-br from-slate-400 to-slate-600 shadow-slate-200'}`}>
                          {initials}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-black text-slate-900 text-[15px] tracking-tight">{agent.name}</span>
                          {agent.isUfficiale ? 
                            <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">Ufficiale</span> : 
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Agente</span>
                          }
                        </div>
                      </div>
                    )}
                  </td>

                  {/* Squadra / Servizio */}
                  <td className="px-6 py-4">
                    {isEditing ? (
                      <div className="flex flex-col gap-3 min-w-[240px]">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[9px] font-black text-slate-600 uppercase mb-1">Squadra</label>
                            <select value={tempRotationGroup} onChange={e => setTempRotationGroup(e.target.value)} className="w-full border-2 border-slate-200 rounded-xl px-2 py-1.5 text-xs font-bold outline-none focus:border-indigo-400 bg-white text-slate-800 transition-all mb-1">
                              <option value="">(Libera) Text: {agent.squadra || ""}</option>
                              {rotationGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                            {!tempRotationGroup && (
                               <input type="text" value={tempSquadra} onChange={e => setTempSquadra(e.target.value.toUpperCase())} placeholder="Es. Squadra A" className="w-full border-2 border-slate-200 rounded-xl px-2 py-1.5 text-xs font-bold outline-none focus:border-indigo-400 bg-white text-slate-800 transition-all" />
                            )}
                          </div>
                          <div>
                            <label className="block text-[9px] font-black text-slate-600 uppercase mb-1">Dettaglio Servizio (Ods)</label>
                            <input type="text" value={tempServizio} onChange={e => setTempServizio(e.target.value)} placeholder="Es. Viabilità" className="w-full border-2 border-slate-200 rounded-xl px-2 py-1.5 text-xs font-bold outline-none focus:border-indigo-400 bg-white text-slate-800 transition-all" />
                          </div>
                        </div>
                        <div className="pt-2 border-t border-slate-100">
                          <label className="block text-[9px] font-black text-slate-600 uppercase mb-1">Gruppo OdS (Macro)</label>
                          <select value={tempDefaultCategoryId} onChange={e => { setTempDefaultCategoryId(e.target.value); setTempDefaultTypeId("") }} className="w-full border-2 border-slate-200 rounded-xl px-2 py-1.5 text-xs font-bold mb-1 outline-none focus:border-indigo-400 bg-white transition-all text-slate-800">
                            <option value="">Nessun Servizio</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                          {tempDefaultCategoryId && (
                            <select value={tempDefaultTypeId} onChange={e => setTempDefaultTypeId(e.target.value)} className="w-full border-2 border-indigo-200 rounded-xl px-2 py-1.5 text-[11px] font-bold text-indigo-700 outline-none focus:border-indigo-400 bg-indigo-50 transition-all">
                              <option value="">Servizio Generico</option>
                              {categories.find(c => c.id === tempDefaultCategoryId)?.types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col flex-wrap gap-2 items-start">
                        <span className="text-[10px] font-black text-slate-700 bg-slate-100 px-3 py-1 rounded-[0.7rem] border border-slate-200 uppercase tracking-widest">
                          {agent.rotationGroup?.name || agent.squadra || "Non assegtato"}
                        </span>
                        {agent.servizio && !agent.defaultServiceCategoryId && (
                           <span className="text-[10px] font-bold text-pink-700 bg-pink-50 px-3 py-0.5 rounded border border-pink-100">
                             {agent.servizio}
                           </span>
                        )}
                        {agent.defaultServiceCategoryId && (
                          <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-3 py-0.5 rounded border border-teal-100">
                            {categories.find(c => c.id === agent.defaultServiceCategoryId)?.name}
                            {agent.defaultServiceTypeId && ` › ${categories.find(c => c.id === agent.defaultServiceCategoryId)?.types.find(t => t.id === agent.defaultServiceTypeId)?.name}`}
                          </span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Qualifica */}
                  <td className="px-6 py-4">
                    <span className="font-bold text-slate-500 text-sm whitespace-nowrap">{agent.qualifica || "Agente"}</span>
                  </td>

                  {/* REP / Max */}
                  <td className="px-6 py-4">
                    {isEditing ? (
                      <input type="number" value={tempMassimale} onChange={e => setTempMassimale(parseInt(e.target.value))} className="border-2 border-amber-200 rounded-xl px-3 py-2 w-20 text-sm font-black outline-none focus:border-amber-400 bg-amber-50 text-amber-900 transition-all" />
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="w-8 h-8 rounded-[0.8rem] bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center font-black text-xs shadow-sm">
                          {agent.massimale}
                        </span>
                      </div>
                    )}
                  </td>

                  {/* Contatti */}
                  <td className="px-6 py-4">
                    {isEditing ? (
                      <div className="flex flex-col gap-2 min-w-[200px]">
                        <input type="email" value={tempEmail} onChange={e => setTempEmail(e.target.value)} placeholder="Email..." className="border-2 border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-400 bg-white text-slate-800 transition-all" />
                        <input type="tel" value={tempPhone} onChange={e => setTempPhone(e.target.value)} placeholder="Telefono..." className="border-2 border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-400 bg-white text-slate-800 transition-all" />
                        <div className="flex items-center gap-2 mt-2 pt-3 border-t border-slate-100">
                          <input type="text" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Nuova Password" className="border-2 border-rose-200 rounded-xl px-3 py-2 text-xs font-bold bg-rose-50 text-rose-800 focus:border-rose-400 transition-all flex-1" />
                          <button onClick={async () => {
                            if (!newPass) return toast.error("Inserisci una password")
                            const res = await fetch("/api/admin/users", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: agent.id, action: "resetPassword", newPassword: newPass }) })
                            if (res.ok) { toast.success("Password aggiornata!"); setNewPass("") }
                          }} className="text-[10px] font-black text-rose-700 bg-rose-100 px-3 py-2 rounded-xl border border-rose-200 hover:bg-rose-500 hover:text-white hover:border-transparent transition-all uppercase tracking-widest shrink-0">Reset</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <span className={`text-[11px] font-bold ${agent.email ? "text-slate-600" : "text-slate-400 italic"}`}>{agent.email || "No Email"}</span>
                        <span className="text-[11px] font-bold text-slate-500">{agent.phone || ""}</span>
                      </div>
                    )}
                  </td>

                  {/* Azioni */}
                  <td className="px-6 py-4 text-right">
                    {isEditing ? (
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setEditingAgent(null)} className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl hover:bg-slate-50 hover:text-slate-700 transition-all active:scale-95">Annulla</button>
                        <button onClick={() => saveEdit(agent.id)} className="text-[10px] font-black uppercase tracking-widest text-white px-5 py-2.5 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95">Salva</button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        {showArchived ? (
                          <button onClick={() => restoreAgent(agent)} className="text-[9px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white px-4 py-2 rounded-xl transition-all shadow-sm border border-emerald-100">Ripristina</button>
                        ) : (
                          <>
                            <button onClick={() => router.push(`/admin/risorse/${agent.id}`)} className="text-[9px] font-black uppercase tracking-widest text-white bg-slate-800 hover:bg-black px-4 py-2 rounded-xl transition-all shadow-md">Fascicolo</button>
                            <button onClick={() => startEdit(agent)} className="text-[9px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-50 hover:bg-indigo-600 hover:text-white px-4 py-2 rounded-xl transition-all shadow-sm border border-indigo-100">Modifica</button>
                            <button onClick={() => deleteAgent(agent)} title="Elimina defintivamente" className="p-2 text-rose-500 bg-rose-50 hover:bg-rose-600 hover:text-white rounded-xl transition-all border border-rose-100 shadow-sm active:scale-95">
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
