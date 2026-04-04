"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { Users, Plus, Trash2, Search, Shield } from "lucide-react"

interface AnagraficaPanelProps {
  agents: {
    id: string; name: string; matricola: string; isUfficiale: boolean;
    email: string | null; phone: string | null; qualifica: string | null;
    gradoLivello: number; squadra: string | null; servizio: string | null; massimale: number;
    defaultServiceCategoryId?: string | null; defaultServiceTypeId?: string | null;
    rotationGroupId?: string | null;
    rotationGroup?: { id: string; name: string } | null;
  }[]
  rotationGroups: any[]
  categories: any[]
}

export default function AnagraficaPanel({ agents, rotationGroups, categories }: AnagraficaPanelProps) {
  const router = useRouter()

  // Filters
  const [searchQuery, setSearchQuery] = useState("")
  const [squadraFilter, setSquadraFilter] = useState("ALL")
  const [qualificaFilter, setQualificaFilter] = useState("ALL")

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
      if (searchQuery && !a.name.toLowerCase().includes(searchQuery.toLowerCase()) && !a.matricola.includes(searchQuery)) return false
      if (squadraFilter !== "ALL") {
        const agentSquadra = a.rotationGroup?.name || a.squadra || "Senza Squadra"
        if (agentSquadra !== squadraFilter) return false
      }
      if (qualificaFilter !== "ALL" && (a.qualifica || "Agente") !== qualificaFilter) return false
      return true
    })
  }, [agents, searchQuery, squadraFilter, qualificaFilter])

  const startEdit = (agent: any) => {
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

  const deleteAgent = async (agent: any) => {
    if (!confirm(`Vuoi davvero eliminare l'agente ${agent.name}? Operazione irreversibile.`)) return
    const res = await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: agent.id }),
    })
    if (res.ok) router.refresh()
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
        <button
          onClick={() => { setShowAddUser(!showAddUser); setTempMatricola(""); setTempName(""); setTempSquadra(""); setNewPass(""); setTempMassimale(8) }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm transition-all shadow-sm ${showAddUser ? "text-slate-600 bg-slate-200 border border-slate-300" : "text-white bg-blue-600 hover:bg-blue-700 shadow-blue-200"}`}
        >
          <Plus size={18} /> {showAddUser ? "Chiudi" : "Nuovo Dipendente"}
        </button>
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
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap min-w-[1100px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Matr.</th>
                <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Agente</th>
                <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Squadra / Servizio</th>
                <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Qualifica</th>
                <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">REP / Max</th>
                <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Contatti</th>
                <th className="px-5 py-3.5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAgents.map(agent => (
                <tr key={agent.id} className={`${editingAgent === agent.id ? "bg-slate-50/90 border-y-2 border-slate-300 shadow-md" : "hover:bg-blue-50/30"} transition-all`}>
                  {/* Matricola */}
                  <td className="px-5 py-3.5">
                    {editingAgent === agent.id ? (
                      <input type="text" value={tempMatricola} onChange={e => setTempMatricola(e.target.value.toUpperCase())} className="border border-slate-300 rounded-lg px-2 py-1.5 w-24 text-sm font-black outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white text-slate-800" />
                    ) : (
                      <span className="text-xs font-mono font-black text-slate-800">{agent.matricola}</span>
                    )}
                  </td>

                  {/* Nome */}
                  <td className="px-5 py-3.5">
                    {editingAgent === agent.id ? (
                      <input type="text" value={tempName} onChange={e => setTempName(e.target.value.toUpperCase())} className="border border-slate-300 rounded-lg px-2 py-1.5 w-48 text-sm font-black outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white text-slate-800" />
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{agent.name}</span>
                        {agent.isUfficiale && <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-black border border-blue-200">UFF</span>}
                      </div>
                    )}
                  </td>

                  {/* Squadra / Servizio */}
                  <td className="px-5 py-3.5">
                    {editingAgent === agent.id ? (
                      <div className="flex flex-col gap-2 min-w-[200px]">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[9px] font-black text-slate-600 uppercase mb-1">Squadra/Turnazione</label>
                            <select value={tempRotationGroup} onChange={e => setTempRotationGroup(e.target.value)} className="border border-slate-300 rounded-lg px-2 py-1.5 w-full text-xs font-bold outline-none focus:border-blue-500 bg-white text-slate-800 focus:ring-1 focus:ring-blue-500 mb-1">
                              <option value="">(Libera) Text: {agent.squadra || ""}</option>
                              {rotationGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                            {!tempRotationGroup && (
                               <input type="text" value={tempSquadra} onChange={e => setTempSquadra(e.target.value.toUpperCase())} placeholder="Es. Squadra A" className="border border-slate-300 rounded-lg px-2 py-1.5 w-full text-xs font-bold outline-none focus:border-blue-500 bg-white text-slate-800 focus:ring-1 focus:ring-blue-500" />
                            )}
                          </div>
                          <div>
                            <label className="block text-[9px] font-black text-slate-600 uppercase mb-1">Servizio Text</label>
                            <input type="text" value={tempServizio} onChange={e => setTempServizio(e.target.value)} placeholder="Es. Viabilità" className="border border-slate-300 rounded-lg px-2 py-1.5 w-full text-xs font-bold outline-none focus:border-blue-500 bg-white text-slate-800 focus:ring-1 focus:ring-blue-500" />
                          </div>
                        </div>
                        <div className="pt-2 border-t border-slate-200">
                          <label className="block text-[9px] font-black text-slate-600 uppercase mb-1">Servizio di Default OdS</label>
                          <select value={tempDefaultCategoryId} onChange={e => { setTempDefaultCategoryId(e.target.value); setTempDefaultTypeId("") }} className="border border-slate-300 rounded-lg px-2 py-1.5 w-full text-[10px] font-bold mb-1 outline-none bg-white text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                            <option value="">Nessun Servizio</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                          {tempDefaultCategoryId && (
                            <select value={tempDefaultTypeId} onChange={e => setTempDefaultTypeId(e.target.value)} className="border border-slate-300 rounded-lg px-2 py-1.5 w-full text-[10px] font-bold text-blue-700 outline-none bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                              <option value="">Generico</option>
                              {categories.find((c: any) => c.id === tempDefaultCategoryId)?.types.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col flex-wrap gap-1 items-start">
                        <span className="text-[10px] bg-slate-100 text-slate-800 font-black px-2.5 py-1.5 rounded-lg border border-slate-200 inline-block">
                          {agent.rotationGroup?.name || agent.squadra || "Senza Squadra"}
                        </span>
                        {agent.servizio && !agent.defaultServiceCategoryId && (
                           <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded border border-indigo-200 inline-block">
                             {agent.servizio}
                           </span>
                        )}
                        {agent.defaultServiceCategoryId && (
                          <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-200 inline-block">
                            {categories.find(c => c.id === agent.defaultServiceCategoryId)?.name}
                            {agent.defaultServiceTypeId && ` ▶ ${categories.find(c => c.id === agent.defaultServiceCategoryId)?.types.find((t: any) => t.id === agent.defaultServiceTypeId)?.name}`}
                          </span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Qualifica */}
                  <td className="px-5 py-3.5">
                    <span className="font-bold text-slate-700 text-xs">{agent.qualifica || "Agente"}</span>
                  </td>

                  {/* REP / Max */}
                  <td className="px-5 py-3.5">
                    {editingAgent === agent.id ? (
                      <input type="number" value={tempMassimale} onChange={e => setTempMassimale(parseInt(e.target.value))} className="border border-slate-300 rounded-lg px-2 py-1.5 w-16 text-sm font-black outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white text-slate-800" />
                    ) : (
                      <span className="font-black px-2.5 py-1 rounded-lg text-xs border bg-slate-50 text-slate-800 border-slate-200">
                        {agent.massimale}
                      </span>
                    )}
                  </td>

                  {/* Contatti */}
                  <td className="px-5 py-3.5">
                    {editingAgent === agent.id ? (
                      <div className="flex flex-col gap-2">
                        <input type="email" value={tempEmail} onChange={e => setTempEmail(e.target.value)} placeholder="Email..." className="border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold outline-none w-48 focus:border-blue-500 bg-white text-slate-800 focus:ring-1 focus:ring-blue-500" />
                        <input type="tel" value={tempPhone} onChange={e => setTempPhone(e.target.value)} placeholder="Telefono..." className="border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold outline-none w-40 focus:border-blue-500 bg-white text-slate-800 focus:ring-1 focus:ring-blue-500" />
                        <div className="flex items-center gap-2 mt-1 pt-2 border-t border-slate-200">
                          <input type="text" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Nuova Password" className="border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold w-32 bg-white text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                          <button onClick={async () => {
                            if (!newPass) return toast.error("Inserisci una password")
                            const res = await fetch("/api/admin/users", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: agent.id, action: "resetPassword", newPassword: newPass }) })
                            if (res.ok) { toast.success("Password aggiornata!"); setNewPass("") }
                          }} className="text-[10px] font-black text-slate-800 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-200 transition-all">Reset</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-0.5">
                        <span className={agent.email ? "text-xs font-semibold text-slate-700" : "text-slate-500 italic text-[10px]"}>{agent.email || "No Email"}</span>
                        <span className="text-[10px] font-semibold text-slate-500">{agent.phone || ""}</span>
                      </div>
                    )}
                  </td>

                  {/* Azioni */}
                  <td className="px-5 py-3.5 text-right">
                    {editingAgent === agent.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setEditingAgent(null)} className="text-xs font-bold text-slate-600 px-4 py-2 bg-slate-100 rounded-xl border border-slate-200 hover:bg-slate-200 transition-all">Annulla</button>
                        <button onClick={() => saveEdit(agent.id)} className="text-xs font-black text-white px-5 py-2 bg-emerald-600 rounded-xl shadow-md hover:bg-emerald-700 transition-all">Salva</button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => router.push(`/admin/risorse/${agent.id}`)} className="text-[11px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-100 border border-indigo-200 hover:bg-indigo-600 hover:text-white px-3 py-2.5 rounded-xl transition-all shadow-sm shadow-indigo-100">Fascicolo</button>
                        <button onClick={() => startEdit(agent)} className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl transition-all shadow-sm">Modifica</button>
                        <button onClick={() => deleteAgent(agent)} title="Elimina" className="p-2 text-red-500 bg-red-50 hover:bg-red-600 hover:text-white rounded-xl transition-all border border-red-100">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
