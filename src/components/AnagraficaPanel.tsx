"use client"
import { AdminPersonnelSlideOver } from "./admin/AdminPersonnelSlideOver"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { 
  Users, Plus, Trash2, Search, Star, ShieldCheck, 
  AlertCircle, Calendar, ChevronRight, UserCheck, 
  FileText, Briefcase, Mail, Phone, Award, Shield, X
} from "lucide-react"
import { useParams } from "next/navigation"

interface AnagraficaPanelProps {
  agents: {
    id: string; name: string; matricola: string; isUfficiale: boolean; isActive: boolean;
    email: string | null; phone: string | null; qualifica: string | null;
    gradoLivello: number; squadra: string | null; servizio: string | null; massimale: number;
    dataDiNascita?: string | null; tipoContratto?: string | null;
    dataAssunzione?: string | null; scadenzaPatente?: string | null;
    scadenzaPortoArmi?: string | null; defaultPartnerIds?: string[] | null;
    fixedServiceDays?: string[] | null;
    defaultServiceCategoryId?: string | null; defaultServiceTypeId?: string | null;
    rotationGroupId?: string | null;
    rotationGroup?: { id: string; name: string } | null;
  }[]
  rotationGroups: { id: string; name: string }[]
  categories: { id: string; name: string; types: { id: string; name: string }[] }[]
}

export default function AnagraficaPanel({ agents, rotationGroups, categories }: AnagraficaPanelProps) {
  const router = useRouter()
  const params = useParams()
  const tenantSlug = params?.tenantSlug as string

  // Filters
  const [searchQuery, setSearchQuery] = useState("")
  const [squadraFilter, setSquadraFilter] = useState("ALL")
  const [qualificaFilter, setQualificaFilter] = useState("ALL")
  const [showArchived, setShowArchived] = useState(false)

  // Edit state (now an object for SlideOver)
  const [editingAgent, setEditingAgent] = useState<any | null>(null)
  
  // Add user state
  const [isSavingUser, setIsSavingUser] = useState(false)

  const uniqueSquadre = useMemo(() => [...new Set(agents.map(a => a.rotationGroup?.name || a.squadra || "Senza Squadra"))].sort(), [agents])
  const uniqueQualifiche = useMemo(() => [...new Set(agents.map(a => a.qualifica || "Agente").filter(Boolean))].sort(), [agents])

  const filteredAgents = useMemo(() => {
    return agents.filter(a => {
      if (a.isActive === showArchived) return false 
      if (searchQuery && !a.name.toLowerCase().includes(searchQuery.toLowerCase()) && !a.matricola.includes(searchQuery)) return false
      if (squadraFilter !== "ALL") {
        const agentSquadra = a.rotationGroup?.name || a.squadra || "Senza Squadra"
        if (agentSquadra !== squadraFilter) return false
      }
      if (qualificaFilter !== "ALL" && (a.qualifica || "Agente") !== qualificaFilter) return false
      return true
    })
  }, [agents, searchQuery, squadraFilter, qualificaFilter, showArchived])

  // --- STATISTICS CALCULATIONS ---
  const stats = useMemo(() => {
    const active = agents.filter(a => a.isActive)
    const ufficiali = active.filter(a => a.isUfficiale).length
    const now = new Date()
    const alertDays = 30
    const documentsExpired = active.filter(a => {
      const p = a.scadenzaPatente ? new Date(a.scadenzaPatente) : null
      const pa = a.scadenzaPortoArmi ? new Date(a.scadenzaPortoArmi) : null
      return (p && p < now) || (pa && pa < now)
    }).length
    
    const partTime = active.filter(a => a.tipoContratto && a.tipoContratto.includes("PT")).length

    return { total: active.length, ufficiali, documentsExpired, partTime }
  }, [agents])

  const deleteAgent = async (agent: { id: string; name: string }) => {
    if (!confirm(`\u26A0\uFE0F Vuoi davvero eliminare l'agente ${agent.name}?\n\nL'operazione \u00E8 irreversibile.`)) return
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: agent.id }),
      })
      if (res.ok) {
        toast.success(`${agent.name} eliminato`)
        window.location.reload()
      } else {
        const data = await res.json()
        toast.error(data.error || "Errore")
      }
    } catch {
      toast.error("Errore connessione")
    }
  }

  const restoreAgent = async (agent: { id: string; name: string }) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: agent.id, action: "restore" }),
      })
      if (res.ok) {
        toast.success(`${agent.name} ripristinato`)
        window.location.reload()
      }
    } catch {
      toast.error("Errore connessione")
    }
  }

  const handleOpenAdd = () => {
    setEditingAgent({ 
      id: "NEW", 
      name: "", 
      matricola: "", 
      isActive: true, 
      isUfficiale: false,
      massimale: 8
    })
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* --- DASHBOARD STATS --- */}
      {!showArchived && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner"><Users width={24} height={24} /></div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Totale Organico</p>
              <p className="text-2xl font-black text-slate-900">{stats.total}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner"><Star width={24} height={24} className="fill-indigo-600" /></div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ufficiali</p>
              <p className="text-2xl font-black text-indigo-600">{stats.ufficiali}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${stats.documentsExpired > 0 ? "bg-rose-50 text-rose-600 animate-pulse" : "bg-emerald-50 text-emerald-600"}`}>
              {stats.documentsExpired > 0 ? <AlertCircle width={24} height={24} /> : <ShieldCheck width={24} height={24} />}
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Doc. Scaduti</p>
              <p className={`text-2xl font-black ${stats.documentsExpired > 0 ? "text-rose-600" : "text-emerald-600"}`}>{stats.documentsExpired}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center shadow-inner"><Calendar width={24} height={24} /></div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mix Part-Time</p>
              <p className="text-2xl font-black text-orange-600">{stats.partTime} <span className="text-xs font-bold text-slate-400">Su {stats.total}</span></p>
            </div>
          </div>
        </div>
      )}

      {/* --- PAGE HEADER & ACTIONS --- */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500">
            {showArchived ? "Archivio Personale" : "Fascicolo Agenti"}
          </h1>
          <p className="text-sm text-slate-500 font-bold uppercase tracking-tight opacity-70">
            Gestione centralizzata dell&apos;anagrafica operativa e contrattuale
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group max-w-xs transition-all duration-300 focus-within:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" width={18} height={18} />
            <input 
              type="text" 
              placeholder="Cerca nome o matricola..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-6 py-3.5 bg-white border border-slate-200 rounded-[1.5rem] text-sm font-black text-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all shadow-sm"
            />
          </div>
          
          {!showArchived && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-6 py-3.5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all shadow-lg bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 active:scale-95 shadow-blue-200"
            >
              <Plus width={16} height={16} /> 
              Aggiungi Operatore
            </button>
          )}

          <button
            onClick={() => setShowArchived(!showArchived)}
            className="p-3.5 bg-white border border-slate-200 rounded-[1.5rem] text-slate-400 hover:text-slate-900 transition-all hover:bg-slate-50 active:scale-90"
            title={showArchived ? "Torna all'Anagrafica" : "Vedi Archivio"}
          >
            <Trash2 width={20} height={20} />
          </button>
        </div>
      </div>

      {/* CREATION FORM REMOVED - NOW USING SLIDEOVER */}

      {/* --- TABLE VIEW --- */}
      <div className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200/40 border border-slate-100 overflow-hidden text-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100">
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Identità</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Inquadramento</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Contratto</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Abilitazioni</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Extra</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredAgents.map(agent => {
                const initials = agent.name.split(' ').map(n => n.charAt(0)).join('').substring(0,2) || 'AG';
                
                // Document checks
                const now = new Date();
                const expiredP = agent.scadenzaPatente ? new Date(agent.scadenzaPatente) < now : false;
                const expiredPA = agent.scadenzaPortoArmi ? new Date(agent.scadenzaPortoArmi) < now : false;

                return (
                <tr 
                  key={agent.id} 
                  className="hover:bg-blue-50/30 transition-all group cursor-pointer" 
                  onClick={() => setEditingAgent(agent)}
                >
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-5">
                      <div className={`w-12 h-12 shrink-0 rounded-[1.25rem] flex items-center justify-center text-white text-xs font-black uppercase tracking-wider shadow-lg transition-transform group-hover:scale-110 ${agent.isUfficiale ? 'bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-indigo-100' : 'bg-gradient-to-br from-slate-700 to-slate-900 shadow-slate-100'}`}>
                        {initials}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-black text-slate-900 text-lg tracking-tight group-hover:text-blue-600 transition-colors uppercase">{agent.name}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <code className="text-[10px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase tracking-widest">{agent.matricola}</code>
                          {agent.isUfficiale && <span className="flex items-center gap-1 text-[8px] font-black text-indigo-500 uppercase bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100"><Star width={8} height={8} className="fill-indigo-500" /> Ufficiale</span>}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-6">
                    <div className="space-y-1.5">
                       <p className="text-sm font-black text-slate-700 tracking-tight">{agent.qualifica || "Agente"}</p>
                       <div className="flex items-center gap-1.5">
                          <Briefcase width={12} height={12} className="text-slate-300" />
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{agent.rotationGroup?.name || agent.squadra || "Senza Squadra"}</span>
                       </div>
                    </div>
                  </td>

                  <td className="px-6 py-6">
                    <div className="flex flex-col gap-1">
                       <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border w-fit ${agent.tipoContratto?.includes("PT") ? "bg-orange-50 text-orange-700 border-orange-100" : "bg-blue-50 text-blue-700 border-blue-100"}`}>
                          {agent.tipoContratto || "FULL-TIME"}
                       </span>
                       {agent.dataAssunzione && <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1"><Calendar width={10} height={10} /> Dal {new Date(agent.dataAssunzione).toLocaleDateString()}</span>}
                    </div>
                  </td>

                  <td className="px-6 py-6">
                    <div className="flex gap-2">
                       <div className={`p-2 rounded-xl border flex items-center justify-center transition-all ${!agent.scadenzaPatente ? "bg-slate-50 border-slate-100 text-slate-200" : expiredP ? "bg-rose-50 border-rose-100 text-rose-500 shadow-sm" : "bg-emerald-50 border-emerald-100 text-emerald-600"}`} title="Patente di Guida">
                          <Award width={16} height={16} />
                       </div>
                       <div className={`p-2 rounded-xl border flex items-center justify-center transition-all ${!agent.scadenzaPortoArmi ? "bg-slate-50 border-slate-100 text-slate-200" : expiredPA ? "bg-rose-50 border-rose-100 text-rose-500 shadow-sm" : "bg-emerald-50 border-emerald-100 text-emerald-600"}`} title="Porto d&apos;Armi">
                          <Shield width={16} height={16} />
                       </div>
                    </div>
                  </td>

                  <td className="px-6 py-6">
                     <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Compagni</p>
                           <p className="text-xs font-black text-slate-700">{(agent.defaultPartnerIds?.length || 0)} Preferiti</p>
                        </div>
                        {agent.defaultPartnerIds && agent.defaultPartnerIds.length > 0 && <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shadow-sm">🤝</div>}
                     </div>
                  </td>

                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0" onClick={e => e.stopPropagation()}>
                       <button onClick={() => router.push(`/${tenantSlug}/admin/risorse/${agent.id}`)} className="p-3 bg-white text-slate-400 hover:text-slate-900 border border-slate-200 rounded-2xl hover:shadow-xl transition-all" title="Storico Servizi"><FileText width={16} height={16} /></button>
                       <button onClick={() => setEditingAgent(agent)} className="px-5 py-3 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-blue-600 transition-all shadow-xl shadow-slate-200">Fascicolo</button>
                    </div>
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-Over Unificato */}
      {editingAgent && (
        <AdminPersonnelSlideOver
          editingAgent={editingAgent}
          setEditingAgent={setEditingAgent as any}
          activeAgentsForPartners={agents.filter(a => a.isActive)}
          categories={categories}
          rotationGroups={rotationGroups}
          onSave={async (id, payload) => {
             const isNew = id === "NEW";
             const method = isNew ? "POST" : "PUT";
             
             // Per i nuovi utenti la password è obbligatoria, lo SlideOver la mette in payload.newPassword
             if (isNew && !payload.newPassword) {
                toast.error("Password obbligatoria per nuovi profili");
                return false;
             }

             const finalPayload = isNew 
                ? { ...payload, password: payload.newPassword } 
                : { userId: id, ...payload };

             const res = await fetch("/api/admin/users", {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(finalPayload)
             });

             if (res.ok) {
                toast.success(isNew ? "Operatore creato correttamente" : "Fascicolo aggiornato");
                router.refresh();
                setEditingAgent(null);
                return true;
             } else {
                const err = await res.json();
                toast.error(err.error || "Errore salvataggio!");
                return false;
             }
          }}
          onDelete={async (id) => {
             await fetch("/api/admin/users", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: id }) });
             toast.success("Agente rimosso dall&apos;organico");
             router.refresh();
          }}
        />
      )}
    </div>
  )
}

