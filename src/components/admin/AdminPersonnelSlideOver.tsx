"use client"
import React, { useState, useEffect } from "react"
import { Users, Clock, Briefcase, Shield, X, FileEdit, Save, Trash2, Star, ShieldCheck } from "lucide-react"

interface AdminPersonnelSlideOverProps {
  editingAgent: any
  setEditingAgent: (agent: any) => void
  onSave: (agentId: string, payload: any) => Promise<boolean>
  onDelete?: (agentId: string) => Promise<void>
  rotationGroups: any[]
  categories: any[]
  activeAgentsForPartners: any[]
}

const RANKS = [
  "DIRIGENTE GENERALE", "DIRIGENTE SUPERIORE", "DIRIGENTE", "COMANDANTE",
  "COMMISSARIO SUPERIORE", "COMMISSARIO CAPO", "COMMISSARIO", "VICE COMMISSARIO",
  "ISPETTORE SUPERIORE", "ISPETTORE CAPO", "ISPETTORE", "VICE ISPETTORE",
  "SOVRINTENDENTE CAPO", "SOVRINTENDENTE", "VICE SOVRINTENDENTE",
  "ASSISTENTE CAPO", "ASSISTENTE", "AGENTE SCELTO", "AGENTE DI P.L.", "AGENTE"
];

export function AdminPersonnelSlideOver({ editingAgent, setEditingAgent, onSave, onDelete, rotationGroups, categories, activeAgentsForPartners }: AdminPersonnelSlideOverProps) {
  const [editTab, setEditTab] = useState<"HR" | "TURNO" | "SEZIONE" | "SERVIZIO" | "DIRITTI" | "PERMESSI">("HR")
  const [tempName, setTempName] = useState("")
  const [tempMatricola, setTempMatricola] = useState("")
  const [tempSquadra, setTempSquadra] = useState("")
  const [tempQualifica, setTempQualifica] = useState("")
  const [tempMassimale, setTempMassimale] = useState(8)
  const [tempEmail, setTempEmail] = useState("")
  const [tempPhone, setTempPhone] = useState("")
  const [tempDataAssunzione, setTempDataAssunzione] = useState("")
  const [tempDataDiNascita, setTempDataDiNascita] = useState("")
  const [tempTipoContratto, setTempTipoContratto] = useState("")
  const [tempScadenzaPatente, setTempScadenzaPatente] = useState("")
  const [tempScadenzaPortoArmi, setTempScadenzaPortoArmi] = useState("")
  const [tempNoteInterne, setTempNoteInterne] = useState("")
  const [tempDefaultPartnerIds, setTempDefaultPartnerIds] = useState<string[]>([])
  const [tempFixedServiceDays, setTempFixedServiceDays] = useState<string[]>([])
  const [tempRotationGroupId, setTempRotationGroupId] = useState("")
  const [tempDefaultCategoryId, setTempDefaultCategoryId] = useState("")
  const [tempDefaultTypeId, setTempDefaultTypeId] = useState("")
  const [tempIsUfficiale, setTempIsUfficiale] = useState(false)
  const [tempHasL104, setTempHasL104] = useState(false)
  const [tempL104Assistiti, setTempL104Assistiti] = useState(1)
  const [tempHasStudyLeave, setTempHasStudyLeave] = useState(false)
  const [tempHasParentalLeave, setTempHasParentalLeave] = useState(false)
  const [tempHasChildSicknessLeave, setTempHasChildSicknessLeave] = useState(false)
  
  // RBAC Flags
  const [tempCanConfigureSystem, setTempCanConfigureSystem] = useState(false)
  const [tempCanManageShifts, setTempCanManageShifts] = useState(false)
  const [tempCanManageUsers, setTempCanManageUsers] = useState(false)
  const [tempCanVerifyClockIns, setTempCanVerifyClockIns] = useState(false)
  const [tempIsActive, setTempIsActive] = useState(true)
  const [tempTwoFactorEnabled, setTempTwoFactorEnabled] = useState(false)

  const [newPass, setNewPass] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    if (editingAgent) {
      setTempName(editingAgent.name)
      setTempMatricola(editingAgent.matricola)
      setTempSquadra(editingAgent.squadra || "")
      setTempQualifica(editingAgent.qualifica || "")
      setTempMassimale(editingAgent.massimale || 8)
      setTempEmail(editingAgent.email || "")
      setTempPhone(editingAgent.phone || "")
      setTempDataAssunzione(editingAgent.dataAssunzione ? new Date(editingAgent.dataAssunzione).toISOString().split('T')[0] : "")
      setTempDataDiNascita(editingAgent.dataDiNascita ? new Date(editingAgent.dataDiNascita).toISOString().split('T')[0] : "")
      setTempTipoContratto(editingAgent.tipoContratto || "")
      setTempScadenzaPatente(editingAgent.scadenzaPatente ? new Date(editingAgent.scadenzaPatente).toISOString().split('T')[0] : "")
      setTempScadenzaPortoArmi(editingAgent.scadenzaPortoArmi ? new Date(editingAgent.scadenzaPortoArmi).toISOString().split('T')[0] : "")
      setTempNoteInterne(editingAgent.noteInterne || "")
      setTempDefaultPartnerIds(editingAgent.defaultPartnerIds || [])
      setTempFixedServiceDays(editingAgent.fixedServiceDays || [])
      setTempRotationGroupId(editingAgent.rotationGroupId || "")
      setTempDefaultCategoryId(editingAgent.defaultServiceCategoryId || "")
      setTempDefaultTypeId(editingAgent.defaultServiceTypeId || "")
      setTempIsUfficiale(editingAgent.isUfficiale || false)
      setTempHasL104(editingAgent.hasL104 || false)
      setTempL104Assistiti(editingAgent.l104Assistiti || 1)
      setTempHasStudyLeave(editingAgent.hasStudyLeave || false)
      setTempHasParentalLeave(editingAgent.hasParentalLeave || false)
      setTempHasChildSicknessLeave(editingAgent.hasChildSicknessLeave || false)
      
      setTempCanConfigureSystem(editingAgent.canConfigureSystem || false)
      setTempCanManageShifts(editingAgent.canManageShifts || false)
      setTempCanManageUsers(editingAgent.canManageUsers || false)
      setTempCanVerifyClockIns(editingAgent.canVerifyClockIns || false)
      setTempIsActive(editingAgent.isActive !== false)
      setTempTwoFactorEnabled(editingAgent.twoFactorEnabled || false)

      setNewPass("")
      setEditTab("HR")
    }
  }, [editingAgent])

  if (!editingAgent) return null

  const handleSave = async () => {
    setIsUpdating(true)
    const payload = {
      name: tempName,
      matricola: tempMatricola,
      squadra: tempSquadra,
      qualifica: tempQualifica,
      massimale: tempMassimale,
      email: tempEmail,
      phone: tempPhone,
      dataAssunzione: tempDataAssunzione ? new Date(tempDataAssunzione).toISOString() : null,
      dataDiNascita: tempDataDiNascita ? new Date(tempDataDiNascita).toISOString() : null,
      scadenzaPatente: tempScadenzaPatente ? new Date(tempScadenzaPatente).toISOString() : null,
      scadenzaPortoArmi: tempScadenzaPortoArmi ? new Date(tempScadenzaPortoArmi).toISOString() : null,
      tipoContratto: tempTipoContratto,
      noteInterne: tempNoteInterne,
      defaultPartnerIds: tempDefaultPartnerIds,
      fixedServiceDays: tempFixedServiceDays,
      rotationGroupId: tempRotationGroupId || null,
      defaultServiceCategoryId: tempDefaultCategoryId || null,
      defaultServiceTypeId: tempDefaultTypeId || null,
      isUfficiale: tempIsUfficiale,
      hasL104: tempHasL104,
      l104Assistiti: tempL104Assistiti,
      hasStudyLeave: tempHasStudyLeave,
      hasParentalLeave: tempHasParentalLeave,
      hasChildSicknessLeave: tempHasChildSicknessLeave,
      canConfigureSystem: tempCanConfigureSystem,
      canManageShifts: tempCanManageShifts,
      canManageUsers: tempCanManageUsers,
      canVerifyClockIns: tempCanVerifyClockIns,
      twoFactorEnabled: tempTwoFactorEnabled,
      isActive: tempIsActive,
      newPassword: newPass || undefined, // Used internally to identify if a reset is requested
      action: newPass ? "resetPassword" : undefined
    }
    await onSave(editingAgent.id, payload)
    setIsUpdating(false)
  }

  return (
    <div className="fixed inset-0 z-[150] flex justify-end bg-slate-900/50 backdrop-blur-sm transition-all" onClick={() => setEditingAgent(null)}>
      <div className="absolute inset-0" onClick={() => setEditingAgent(null)} />
      <div className="relative w-full max-w-xl bg-white h-[100dvh] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-200 overflow-hidden" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="px-6 py-5 bg-slate-900 text-white flex flex-col shrink-0">
           <div className="flex items-center justify-between">
             <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 rounded-xl"><FileEdit width={20} height={20} /></div>
                <div>
                  <h3 className="font-black text-lg uppercase tracking-tight">Fascicolo Operatore</h3>
                  <p className="text-[10px] text-white/40 font-bold">{editingAgent.name}</p>
                </div>
             </div>
             <button onClick={() => setEditingAgent(null)} className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-xl hover:bg-white/20 transition-all"><X width={20} height={20} /></button>
           </div>
           
           <div className="mt-5 flex gap-1.5 overflow-x-auto no-scrollbar">
              {[
                { id: "HR", icon: Users, label: "Personale" },
                { id: "TURNO", icon: Clock, label: "Ciclo Turni" },
                { id: "SEZIONE", icon: Briefcase, label: "Sezione" },
                { id: "SERVIZIO", icon: Shield, label: "Servizio & Pattuglia" },
                { id: "DIRITTI", icon: ShieldCheck, label: "Diritti" },
                { id: "PERMESSI", icon: Shield, label: "Permessi" }
              ].map(tab => (
                 <button 
                   key={tab.id}
                   onClick={() => setEditTab(tab.id as any)}
                   className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${editTab === tab.id ? "bg-white text-slate-900 shadow-md" : "text-white/50 bg-white/5 hover:bg-white/10 hover:text-white"}`}
                 >
                    <tab.icon width={12} height={12} /> {tab.label}
                 </button>
              ))}
           </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 custom-scrollbar">
           {/* SCHEDA 1: PERSONALE E HR */}
           {editTab === "HR" && (
             <div className="space-y-6 animate-in fade-in duration-300">
                <div className="space-y-4">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] border-b border-slate-200 pb-2">📋 Anagrafica Base</h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase">Nome</label><input value={tempName} onChange={e => setTempName(e.target.value.toUpperCase())} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black focus:border-blue-400 outline-none transition-all" /></div>
                      <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase">Data di Nascita</label><input type="date" value={tempDataDiNascita} onChange={e => setTempDataDiNascita(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black focus:border-blue-400 outline-none transition-all" /></div>
                      <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase">Ruolo / Squadra</label>
                        <input value={tempSquadra} onChange={e => setTempSquadra(e.target.value.toUpperCase())} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black focus:border-blue-400 outline-none" placeholder="Es. VIABILITA" />
                      </div>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1 md:col-span-2">
                         <label className="text-[10px] font-black text-slate-500 uppercase">Qualifica & Grado</label>
                         <select value={tempQualifica} onChange={e => setTempQualifica(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black focus:border-blue-400 outline-none cursor-pointer">
                           <option value="">Seleziona Grado...</option>
                           {RANKS.map(r => <option key={r} value={r}>{r}</option>)}
                           {tempQualifica && !RANKS.includes(tempQualifica) && <option value={tempQualifica}>{tempQualifica}</option>}
                         </select>
                      </div>
                      <div className="space-y-1">
                         <label className="text-[10px] font-black text-slate-500 uppercase">Status</label>
                         <button 
                            onClick={() => setTempIsUfficiale(!tempIsUfficiale)}
                            className={`w-full h-[42px] rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${tempIsUfficiale ? 'bg-indigo-600 border-indigo-700 text-white shadow-md' : 'bg-white border-slate-200 text-slate-400'}`}
                         >
                            <Star width={16} height={16} className={tempIsUfficiale ? 'fill-white' : ''} />
                            <span className="text-[10px] font-black uppercase">{tempIsUfficiale ? 'Ufficiale' : 'Agente'}</span>
                         </button>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase">Matricola</label><input value={tempMatricola} onChange={e => setTempMatricola(e.target.value.toUpperCase())} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black focus:border-blue-400 outline-none" /></div>
                      <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase">Max REP</label>
                         <input type="number" value={tempMassimale} onChange={e => setTempMassimale(parseInt(e.target.value))} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black focus:border-blue-400 outline-none" />
                      </div>
                      <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase">Inquadramento</label>
                         <div className="h-[42px] flex items-center px-3 bg-slate-100 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest border border-slate-200 overflow-hidden text-ellipsis whitespace-nowrap">
                            {tempRotationGroupId ? rotationGroups.find(g => g.id === tempRotationGroupId)?.name : "DINAMICO"}
                         </div>
                      </div>
                   </div>
                </div>
                
                <div className="space-y-4">
                   <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.15em] border-b border-emerald-100 pb-2">📧 Contatti & Accesso</h4>
                   <div className="grid grid-cols-2 gap-3">
                     <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase">Email</label><input value={tempEmail} onChange={e => setTempEmail(e.target.value)} type="email" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black focus:border-emerald-400 outline-none" /></div>
                     <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase">Cellulare</label><input value={tempPhone} onChange={e => setTempPhone(e.target.value)} type="tel" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black focus:border-emerald-400 outline-none" /></div>
                   </div>
                   <div className="space-y-1"><label className="text-[10px] font-black text-rose-500 uppercase">Cambia Password</label><input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} className="w-full bg-white border border-rose-200 rounded-xl px-3 py-2.5 text-sm font-black focus:border-rose-400 outline-none" placeholder="Lascia vuoto per non cambiare" /></div>
                </div>

                <div className="space-y-4">
                   <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.15em] border-b border-indigo-100 pb-2">⚙️ Risorse Umane & Documenti</h4>
                   <div className="grid grid-cols-2 gap-3">
                     <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase">Data Assunzione</label><input type="date" value={tempDataAssunzione} onChange={e => setTempDataAssunzione(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black focus:border-indigo-400 outline-none" /></div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase">Contratto</label>
                        <select value={tempTipoContratto} onChange={e => setTempTipoContratto(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black focus:border-indigo-400 outline-none cursor-pointer">
                           <option value="">Full-Time (36h)</option>
                           <option value="PT_30">Part-Time (30h)</option>
                           <option value="PT_24">Part-Time (24h)</option>
                           <option value="PT_18">Part-Time (18h)</option>
                        </select>
                     </div>
                   </div>
                   <div className="grid grid-cols-2 gap-3">
                     <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase">Patente</label><input type="date" value={tempScadenzaPatente} onChange={e => setTempScadenzaPatente(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black focus:border-indigo-400 outline-none" /></div>
                     <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase">Porto Armi</label><input type="date" value={tempScadenzaPortoArmi} onChange={e => setTempScadenzaPortoArmi(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black focus:border-indigo-400 outline-none" /></div>
                   </div>
                   <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase">Note Interne</label><textarea value={tempNoteInterne} onChange={e => setTempNoteInterne(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold h-20 resize-none focus:border-indigo-400 outline-none transition-all" /></div>
                </div>
             </div>
           )}

           {/* SCHEDA 2: TURNO CICLICO */}
           {editTab === "TURNO" && (
             <div className="space-y-6 animate-in fade-in duration-300">
                <div className="bg-orange-50/50 p-5 rounded-2xl border border-orange-200/50 space-y-4">
                   <h4 className="text-sm font-black text-orange-600 uppercase flex items-center gap-2"><Clock viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" /> Assegnazione Motore Ciclico</h4>
                   <p className="text-xs text-slate-500 font-medium">Seleziona il gruppo di turnazione (Es. M8 / P14 / R / P15). Chi non ha un gruppo ciclico lavorerà "a disposizione".</p>
                   <select value={tempRotationGroupId} onChange={e => setTempRotationGroupId(e.target.value)} className="w-full border-2 border-orange-200 rounded-xl px-4 py-3 text-sm font-black bg-white hover:bg-orange-50 focus:border-orange-400 outline-none transition-all cursor-pointer shadow-sm text-slate-800">
                     <option value="">Nessuno (Turno Dinamico)</option>
                     {rotationGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                   </select>
                </div>

                <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-200/50 space-y-4">
                   <h4 className="text-sm font-black text-indigo-700 uppercase">Obiettivo Reperibilità Mensile</h4>
                   <div className="space-y-1"><label className="text-[10px] font-black text-indigo-500 uppercase">Max REP Estensione</label><input type="number" value={tempMassimale} onChange={e => setTempMassimale(parseInt(e.target.value))} className="w-full border-2 border-indigo-200 rounded-xl px-4 py-3 text-sm font-black bg-white focus:border-indigo-400 outline-none transition-all" /></div>
                </div>
             </div>
           )}

           {/* SCHEDA 3: SEZIONE (MACRO) */}
           {editTab === "SEZIONE" && (
             <div className="space-y-6 animate-in fade-in duration-300">
                <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-200/50 space-y-4">
                   <h4 className="text-sm font-black text-blue-700 uppercase flex items-center gap-2"><Briefcase viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" /> Afferenza Organizzativa</h4>
                   <p className="text-xs text-slate-500 font-medium">Seleziona la Divisione/Sezione fissa in cui è inquadrato l'agente. Questa si rifletterà di default nei suoi OdS.</p>
                   <select value={tempDefaultCategoryId} onChange={e => { setTempDefaultCategoryId(e.target.value); setTempDefaultTypeId(""); }} className="w-full border-2 border-blue-200 rounded-xl px-4 py-3 text-sm font-black bg-white hover:bg-blue-50 focus:border-blue-500 outline-none transition-all cursor-pointer shadow-sm text-slate-800">
                     <option value="">Nessuna Sezione / A Disposizione</option>
                     {categories.map((c:any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </select>
                </div>
                {editingAgent.squadra && (
                    <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 space-y-2 opacity-60">
                       <h4 className="text-[10px] font-black text-slate-500 uppercase">Nota Storica da Excel</h4>
                       <div className="flex justify-between items-center bg-white px-3 py-2 rounded-lg border border-slate-200">
                          <span className="text-xs font-bold text-slate-400">Ex "Squadra" di testo:</span>
                          <span className="text-xs font-black text-slate-700 uppercase">{editingAgent.squadra}</span>
                       </div>
                       <p className="text-[9px] font-bold text-slate-400">Questo dato è conservato per compatibilità ma l'assegnazione reale segue ora la selezione in alto.</p>
                    </div>
                )}
              </div>
            )}

           {/* SCHEDA 4: SERVIZIO E PATTUGLIA */}
           {editTab === "SERVIZIO" && (
             <div className="space-y-6 animate-in fade-in duration-300">
                <div className="bg-violet-50/50 p-5 rounded-2xl border border-violet-200/50 space-y-4">
                   <h4 className="text-sm font-black text-violet-700 uppercase flex items-center gap-2"><Shield viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" /> Mansione Tipica (Dettaglio)</h4>
                   <p className="text-xs text-slate-500 font-medium">Specifica la tipologia di servizio di default all'interno della sezione scelta.</p>
                   <select value={tempDefaultTypeId} onChange={e => setTempDefaultTypeId(e.target.value)} disabled={!tempDefaultCategoryId} className="w-full border-2 border-violet-200 rounded-xl px-4 py-3 text-sm font-black bg-white hover:bg-violet-50 focus:border-violet-500 outline-none transition-all cursor-pointer shadow-sm disabled:opacity-50 text-slate-800">
                     <option value="">Generico / Tuttofare</option>
                     {(categories.find((c:any) => c.id === tempDefaultCategoryId)?.types || []).map((t:any) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                     ))}
                   </select>
                </div>

                <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-200/50 space-y-4">
                   <h4 className="text-sm font-black text-emerald-700 uppercase flex items-center gap-2"><Users viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" /> Regole Squadra Fissa (Pattuglia)</h4>
                   
                   <div>
                      <label className="text-[10px] font-black text-emerald-600 uppercase mb-2 block">Preferenze Compagni di Pattuglia (Priorità 1°, 2°, 3°...)</label>
                      <div className="flex flex-col gap-2">
                         {tempDefaultPartnerIds.map((pid, idx) => (
                            <div key={idx} className="flex gap-2 items-center">
                               <span className="w-6 text-center text-[10px] font-black text-emerald-500">{idx+1}°</span>
                               <select value={pid} onChange={(e) => {
                                  const newIds = [...tempDefaultPartnerIds]
                                  newIds[idx] = e.target.value
                                  setTempDefaultPartnerIds(newIds)
                               }} className="flex-1 border-2 border-emerald-100 rounded-xl px-3 py-2 text-xs font-black bg-white text-slate-700 outline-none focus:border-emerald-400">
                                  <option value="">Seleziona...</option>
                                  {activeAgentsForPartners.filter(a => a.id !== editingAgent.id).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                               </select>
                               <button onClick={() => setTempDefaultPartnerIds(tempDefaultPartnerIds.filter((_, i) => i !== idx))} className="w-8 h-8 flex items-center justify-center bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-500 hover:text-white transition-all"><X width={14} height={14} /></button>
                            </div>
                         ))}
                         <button onClick={() => setTempDefaultPartnerIds([...tempDefaultPartnerIds, ""])} className="text-[10px] font-black bg-emerald-100 text-emerald-700 hover:bg-emerald-600 hover:text-white px-3 py-2 rounded-lg transition-all self-start mt-1">+ Aggiungi Fallback</button>
                      </div>
                      <p className="text-[9.5px] text-emerald-600 mt-2 font-semibold">Il generatore OdS cercherà di affiancarlo al 1° collega. Se assente, scalerà al 2°, ecc.</p>
                   </div>

                   <div className="pt-4 border-t border-emerald-100/50">
                      <label className="text-[10px] font-black text-emerald-600 uppercase mb-2 block">Giorni Pattuglia / Servizio Fissi</label>
                      <div className="flex gap-2 flex-wrap">
                         {['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM'].map(d => {
                            const active = tempFixedServiceDays.includes(d)
                            return (
                               <button key={d} onClick={() => {
                                  if(active) setTempFixedServiceDays(tempFixedServiceDays.filter(x => x !== d))
                                  else setTempFixedServiceDays([...tempFixedServiceDays, d])
                               }} className={`w-11 h-11 rounded-xl flex items-center justify-center text-[10px] font-black transition-all border ${active ? 'bg-emerald-500 text-white border-emerald-600 shadow-md transform scale-105' : 'bg-white text-slate-400 border-emerald-100 hover:border-emerald-300'}`}>
                                  {d.slice(0, 1)}
                               </button>
                            )
                         })}
                      </div>
                   </div>
                </div>
             </div>
           )}

           {/* SCHEDA 5: DIRITTI E AGEVOLAZIONI */}
           {editTab === "DIRITTI" && (
             <div className="space-y-6 animate-in fade-in duration-300">
               <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-200/50 space-y-6">
                  <div className="flex items-center justify-between">
                     <div className="space-y-1">
                        <h4 className="text-sm font-black text-blue-700 uppercase">Legge 104 / 92</h4>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Abilitazione permessi mensili (3gg o 18h)</p>
                     </div>
                     <button 
                       onClick={() => setTempHasL104(!tempHasL104)}
                       className={`w-12 h-6 rounded-full transition-all relative ${tempHasL104 ? 'bg-blue-600 shadow-inner' : 'bg-slate-200'}`}
                     >
                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all ${tempHasL104 ? 'translate-x-6' : ''}`} />
                     </button>
                  </div>

                  {tempHasL104 && (
                    <div className="p-4 bg-white rounded-xl border border-blue-100 animate-in slide-in-from-top-2 duration-200">
                       <label className="text-[10px] font-black text-slate-400 uppercase mb-3 block">Numero Assistiti (Budget Raddoppiato se 2)</label>
                       <div className="flex gap-2">
                          {[1, 2].map(n => (
                             <button 
                                key={n}
                                onClick={() => setTempL104Assistiti(n)}
                                className={`flex-1 py-2 rounded-lg text-xs font-black transition-all border ${tempL104Assistiti === n ? 'bg-blue-600 border-blue-700 text-white shadow-md' : 'bg-slate-50 border-slate-200 text-slate-400'}`}
                             >
                                {n} {n === 1 ? 'Assistito' : 'Assistiti'}
                             </button>
                          ))}
                       </div>
                       <p className="text-[9px] text-blue-500 mt-2 font-bold italic text-center uppercase tracking-tight">Budget: {tempL104Assistiti * 3} Giorni / {tempL104Assistiti * 18} Ore Mensili</p>
                    </div>
                  )}
               </div>

               <div className="grid grid-cols-1 gap-4">
                  <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-200/50 flex items-center justify-between">
                     <div className="space-y-1">
                        <h4 className="text-sm font-black text-indigo-700 uppercase">Diritto allo Studio</h4>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">150 ore annuali</p>
                     </div>
                     <button 
                       onClick={() => setTempHasStudyLeave(!tempHasStudyLeave)}
                       className={`w-12 h-6 rounded-full transition-all relative ${tempHasStudyLeave ? 'bg-indigo-600 shadow-inner' : 'bg-slate-200'}`}
                     >
                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all ${tempHasStudyLeave ? 'translate-x-6' : ''}`} />
                     </button>
                  </div>

                  <div className="bg-rose-50/50 p-5 rounded-2xl border border-rose-200/50 flex items-center justify-between">
                     <div className="space-y-1">
                       <h4 className="text-sm font-black text-rose-700 uppercase">Congedi Parentali</h4>
                       <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Diritto ai congedi per figli</p>
                     </div>
                     <button 
                       onClick={() => setTempHasParentalLeave(!tempHasParentalLeave)}
                       className={`w-12 h-6 rounded-full transition-all relative ${tempHasParentalLeave ? 'bg-rose-600 shadow-inner' : 'bg-slate-200'}`}
                     >
                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all ${tempHasParentalLeave ? 'translate-x-6' : ''}`} />
                     </button>
                  </div>

                  <div className="bg-rose-50/50 p-5 rounded-2xl border border-rose-200/50 flex items-center justify-between">
                     <div className="space-y-1">
                       <h4 className="text-sm font-black text-rose-700 uppercase">Malattia Figlio</h4>
                       <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Assenze per malattia prole</p>
                     </div>
                     <button 
                       onClick={() => setTempHasChildSicknessLeave(!tempHasChildSicknessLeave)}
                       className={`w-12 h-6 rounded-full transition-all relative ${tempHasChildSicknessLeave ? 'bg-rose-600 shadow-inner' : 'bg-slate-200'}`}
                     >
                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all ${tempHasChildSicknessLeave ? 'translate-x-6' : ''}`} />
                     </button>
                  </div>
               </div>
   </div>
            )}

            {/* SCHEDA 5: PERMESSI */}
            {editTab === "PERMESSI" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="bg-slate-100 p-5 rounded-2xl border border-slate-200">
                   <h4 className="text-sm font-black text-slate-800 uppercase flex items-center gap-2 mb-2"><ShieldCheck width={16} height={16} className="text-slate-500" /> Controllo Accessi</h4>
                   <p className="text-xs text-slate-500 font-medium mb-6">Attiva i permessi granulari per delegare specifiche funzioni amministrative a questo utente, senza concedere privilegi globali.</p>
                   
                   <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                         <div>
                            <p className="text-xs font-black text-slate-800 uppercase tracking-widest">Configurazione Sistema</p>
                            <p className="text-[10px] text-slate-400 font-bold leading-tight mt-1">Può modificare impostazioni globali e categorie servizi.</p>
                         </div>
                         <button 
                           onClick={() => setTempCanConfigureSystem(!tempCanConfigureSystem)}
                           className={`w-12 h-6 shrink-0 rounded-full transition-all relative ${tempCanConfigureSystem ? 'bg-indigo-600 shadow-inner' : 'bg-slate-200'}`}
                         >
                            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all ${tempCanConfigureSystem ? 'translate-x-6' : ''}`} />
                         </button>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                         <div>
                            <p className="text-xs font-black text-slate-800 uppercase tracking-widest">Gestione Turni</p>
                            <p className="text-[10px] text-slate-400 font-bold leading-tight mt-1">Può creare, modificare ed eliminare i turni di servizio.</p>
                         </div>
                         <button 
                           onClick={() => setTempCanManageShifts(!tempCanManageShifts)}
                           className={`w-12 h-6 shrink-0 rounded-full transition-all relative ${tempCanManageShifts ? 'bg-emerald-600 shadow-inner' : 'bg-slate-200'}`}
                         >
                            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all ${tempCanManageShifts ? 'translate-x-6' : ''}`} />
                         </button>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                         <div>
                            <p className="text-xs font-black text-slate-800 uppercase tracking-widest">Gestione Personale</p>
                            <p className="text-[10px] text-slate-400 font-bold leading-tight mt-1">Può aggiungere/modificare agenti e i loro permessi (HR).</p>
                         </div>
                         <button 
                           onClick={() => setTempCanManageUsers(!tempCanManageUsers)}
                           className={`w-12 h-6 shrink-0 rounded-full transition-all relative ${tempCanManageUsers ? 'bg-amber-500 shadow-inner' : 'bg-slate-200'}`}
                         >
                            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all ${tempCanManageUsers ? 'translate-x-6' : ''}`} />
                         </button>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                         <div>
                            <p className="text-xs font-black text-slate-800 uppercase tracking-widest">Verifica Timbrature</p>
                            <p className="text-[10px] text-slate-400 font-bold leading-tight mt-1">Può confermare/modificare gli orari del cartellino.</p>
                         </div>
                         <button 
                           onClick={() => setTempCanVerifyClockIns(!tempCanVerifyClockIns)}
                           className={`w-12 h-6 shrink-0 rounded-full transition-all relative ${tempCanVerifyClockIns ? 'bg-blue-600 shadow-inner' : 'bg-slate-200'}`}
                         >
                            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all ${tempCanVerifyClockIns ? 'translate-x-6' : ''}`} />
                         </button>
                      </div>
                   </div>
                </div>

                <div className="bg-rose-50 p-5 rounded-2xl border border-rose-100 mt-6">
                   <h4 className="text-sm font-black text-rose-800 uppercase flex items-center gap-2 mb-2">Stato Account</h4>
                   <div className="flex items-center justify-between">
                         <p className="text-[10px] text-rose-600/80 font-bold leading-tight max-w-[250px]">Disattivare un account impedisce l'accesso e l'assegnazione nei turni, ma conserva lo storico (Soft Delete).</p>
                         <button 
                           onClick={() => setTempIsActive(!tempIsActive)}
                           className={`w-12 h-6 shrink-0 rounded-full transition-all relative ${tempIsActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
                         >
                            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all ${tempIsActive ? 'translate-x-6' : ''}`} />
                         </button>
                   </div>
                </div>
              </div>
            )}
         </div>

        {/* Actions */}
        <div className="p-4 border-t border-slate-200 bg-white flex gap-3 shrink-0">
          {onDelete && (
            <button onClick={async () => {
               if(!confirm("Eliminare definitivamente l'agente?")) return;
               await onDelete(editingAgent.id);
               setEditingAgent(null);
            }} className="p-3 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all border border-rose-100"><Trash2 width={18} height={18} /></button>
          )}
          <button onClick={handleSave} disabled={isUpdating} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-200 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50">
            {isUpdating ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></span> : <Save width={16} height={16} />} Salva
          </button>
        </div>
      </div>
    </div>
  )
}
