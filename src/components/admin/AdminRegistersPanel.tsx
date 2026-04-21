"use client"

import { useState, useEffect, useMemo } from "react"
import { Clock, WalletCards, Search, LogIn, LogOut, Activity, ArrowLeft, Save, Briefcase, CalendarClock, MessageCircleWarning, Info, FileStack, CheckCircle2, XCircle, X } from "lucide-react"
import { getLabel, AGENDA_CATEGORIES, getUnit } from "@/utils/agenda-codes"
import { toast } from "react-hot-toast"

export default function AdminRegistersPanel({ allAgents, currentYear, currentMonth, settings, onClose }: any) {
  const [search, setSearch] = useState('')
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  
  // Data for all agents
  const [balancesData, setBalancesData] = useState<any>(null)
  const [loadingContext, setLoadingContext] = useState(true)

  const [activeTab, setActiveTab] = useState('cartellino') // 'cartellino', 'saldi', 'richieste'

  const fetchBalances = () => {
    setLoadingContext(true)
    fetch(`/api/admin/balances?year=${currentYear}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(d => {
        if (!d.error) setBalancesData(d)
      })
      .finally(() => setLoadingContext(false))
  }

  useEffect(() => {
    fetchBalances()
  }, [currentYear])

  const filteredAgents = allAgents?.filter((a: any) => 
     a.name.toLowerCase().includes(search.toLowerCase()) || 
     a.matricola.includes(search)
  )

  const selectedAgent = allAgents?.find((a: any) => a.id === selectedAgentId)

  return (
    <div className="bg-white md:rounded-[2rem] border-0 md:border border-slate-200 shadow-2xl flex flex-col md:flex-row overflow-hidden w-full h-full relative p-0">
      
      {/* Tasto Chiudi Mobile & Desktop */}
      <div className="absolute top-4 right-4 z-50">
        <button onClick={onClose} className="bg-slate-900/5 hover:bg-rose-500 hover:text-white p-2.5 rounded-xl shadow-sm text-slate-500 transition-all font-black text-xs">
           <X size={20} />
        </button>
      </div>

      {/* SIDEBAR: Lista Agenti */}
      <div className={`${selectedAgentId ? 'hidden md:flex' : 'flex'} w-full md:w-[350px] lg:w-[400px] flex-col border-r border-slate-100 bg-slate-50 shrink-0`}>
         <div className="p-6 border-b border-slate-200 bg-white shadow-sm z-10 pr-16 relative">
            <h3 className="text-xl font-black text-slate-800 mb-4 bg-gradient-to-r from-slate-900 to-indigo-900 bg-clip-text text-transparent">Fascicoli Personali</h3>
            <div className="relative">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
               <input 
                 type="text" 
                 placeholder="Cerca agente o matricola..." 
                 value={search}
                 onChange={e => setSearch(e.target.value)}
                 className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all shadow-inner"
               />
            </div>
         </div>
         
         <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
            {!filteredAgents?.length ? (
               <p className="text-center text-slate-400 text-xs font-bold uppercase tracking-widest mt-10">Nessun operatore</p>
            ) : filteredAgents.map((agent: any) => (
               <button 
                  key={agent.id}
                  onClick={() => {
                     setSelectedAgentId(agent.id)
                     setActiveTab('cartellino')
                  }}
                  className={`w-full text-left p-4 rounded-2xl transition-all border ${selectedAgentId === agent.id ? 'bg-indigo-600 border-indigo-700 shadow-lg shadow-indigo-200 text-white translate-x-1' : 'bg-white border-slate-100 text-slate-700 hover:border-indigo-200 hover:shadow-md'}`}
               >
                  <p className="font-black truncate">{agent.name}</p>
                  <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${selectedAgentId === agent.id ? 'text-indigo-200' : 'text-slate-400'}`}>
                    Matr. {agent.matricola}
                  </p>
               </button>
            ))}
         </div>
      </div>

      {/* DETAIL VIEW */}
      <div className={`${!selectedAgentId ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-white relative`}>
         {!selectedAgentId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-300 p-8 text-center bg-slate-50/50">
               <Briefcase size={80} className="mb-6 opacity-50" />
               <h3 className="text-2xl font-black text-slate-400">Seleziona un Operatore</h3>
               <p className="font-bold text-slate-400 text-sm mt-2 max-w-sm">Apri il fascicolo personale per gestire i cartellini, configurare i saldi ferie e revisionare le richieste.</p>
            </div>
         ) : (
            <>
               <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-slate-50">
                  <div className="w-full md:w-auto">
                     <button onClick={() => setSelectedAgentId(null)} className="md:hidden flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200 mb-4 shadow-sm">
                        <ArrowLeft size={14} /> Indietro
                     </button>
                     <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg border border-indigo-700/50">
                           {selectedAgent.name.charAt(0)}
                        </div>
                        <div>
                           <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-2">{selectedAgent.name}</h2>
                           <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                             <span className="w-2 h-2 bg-emerald-500 rounded-full inline-block"></span>
                             {selectedAgent.isUfficiale ? 'Ufficiale' : 'Agente'} • {selectedAgent.matricola}
                           </p>
                        </div>
                     </div>
                  </div>

                  <div className="w-full md:w-auto p-1 bg-slate-200 rounded-xl flex gap-1 shadow-inner">
                     <button 
                        onClick={() => setActiveTab('cartellino')}
                        className={`flex-1 md:flex-none px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'cartellino' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:bg-slate-300'}`}
                     >
                        <Clock size={16} className="inline mr-2" /> Cartellino
                     </button>
                     <button 
                        onClick={() => setActiveTab('saldi')}
                        className={`flex-1 md:flex-none px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'saldi' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:bg-slate-300'}`}
                     >
                        <WalletCards size={16} className="inline mr-2" /> Saldi Ferie
                     </button>
                     <button 
                        onClick={() => setActiveTab('richieste')}
                        className={`flex-1 md:flex-none px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'richieste' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:bg-slate-300'}`}
                     >
                        <FileStack size={16} className="inline mr-2" /> Richieste Pendenze
                     </button>
                  </div>
               </div>

               <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 bg-white relative">
                  {loadingContext ? (
                     <div className="flex justify-center py-20"><Activity className="animate-spin text-indigo-400" size={32} /></div>
                  ) : (
                     <>
                        {activeTab === 'cartellino' && <AgentDossierCartellino userId={selectedAgentId} currentYear={currentYear} />}
                        {activeTab === 'saldi' && <AgentDossierSaldi key={selectedAgentId} userId={selectedAgentId} agent={selectedAgent} balancesData={balancesData} currentYear={currentYear} onRefresh={fetchBalances} />}
                        {activeTab === 'richieste' && <AgentDossierRichieste userId={selectedAgentId} currentYear={currentYear} />}
                     </>
                  )}
               </div>
            </>
         )}
      </div>
    </div>
  )
}

function AgentDossierCartellino({ userId, currentYear }: { userId: string, currentYear: number }) {
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/clock-records?userId=${userId}&limit=100`)
      .then(res => res.json())
      .then(data => {
        if (data.records) setRecords(data.records)
      })
      .finally(() => setLoading(false))
  }, [userId])

  const groupedByDay = records.reduce((acc: any, r: any) => {
    const d = new Date(r.timestamp).toLocaleDateString('it-IT')
    if (!acc[d]) acc[d] = []
    acc[d].push(r)
    return acc
  }, {})

  if (loading) return <div className="flex justify-center py-12"><Activity className="animate-spin text-indigo-400" size={24} /></div>

  if (records.length === 0) {
     return (
        <div className="text-center py-24 text-slate-400">
           <CalendarClock size={48} className="mx-auto mb-4 opacity-30" />
           <p className="font-bold uppercase tracking-widest text-sm">Nessuna timbratura registrata.</p>
        </div>
     )
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
       <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-start gap-4 mb-8">
          <Info className="text-indigo-500 shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="font-bold text-indigo-900 text-sm">Storico Timbrature Recenti</h4>
            <p className="text-xs text-indigo-700/70 mt-1 font-medium">Visualizzazione cronologica degli ultimi 100 eventi di Entrata e Uscita dell'agente. Utile per verifiche incrociate in caso di anomalie.</p>
          </div>
       </div>

       {Object.keys(groupedByDay).map(date => {
          const dayRecords = groupedByDay[date]
          return (
            <div key={date} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 sm:p-5 relative overflow-hidden group hover:border-slate-300 transition-colors">
               <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-50">
                  <span className="text-sm font-black text-slate-800 bg-slate-100 px-3 py-1 rounded-full">{date}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{dayRecords.length} Eventi</span>
               </div>
               <div className="space-y-3">
                  {dayRecords.map((r: any) => {
                     const isEnter = r.type === "SCENDI_IN_STRADA" || r.type === "INIZIO_TURNO"
                     return (
                        <div key={r.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200">
                           <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${isEnter ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                 {isEnter ? <LogIn size={18} /> : <LogOut size={18} />}
                              </div>
                              <div>
                                 <p className="text-lg font-black text-slate-900 leading-none">{new Date(r.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</p>
                                 <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">{isEnter ? "Entrata" : "Uscita"}</p>
                              </div>
                           </div>
                           <div className="text-right">
                              {r.isVerified ? (
                                 <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-700 bg-emerald-100 px-2 py-1 rounded-md uppercase tracking-widest">
                                    <CheckCircle2 size={12} /> Rilevato GPS
                                 </span>
                              ) : (
                                 <span className="inline-flex items-center gap-1 text-[9px] font-black text-amber-700 bg-amber-100 px-2 py-1 rounded-md uppercase tracking-widest">
                                    <MessageCircleWarning size={12} /> Mod. Manuale
                                 </span>
                              )}
                           </div>
                        </div>
                     )
                  })}
               </div>
            </div>
          )
       })}
    </div>
  )
}

function AgentDossierSaldi({ userId, agent, balancesData, currentYear, onRefresh }: { userId: string, agent: any, balancesData: any, currentYear: number, onRefresh: () => void }) {
  const [saving, setSaving] = useState(false)
  const [detailTarget, setDetailTarget] = useState<any>(null)
  const [monthlyDetailData, setMonthlyDetailData] = useState<any>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const openDetail = async (ct: any) => {
    setDetailTarget(ct);
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/admin/balances/detail?year=${currentYear}&userId=${userId}`);
      const data = await res.json();
      setMonthlyDetailData(data);
    } catch(e) { console.error(e); }
    setLoadingDetail(false);
  }
  
  // ─── CONFIGURAZIONE DINAMICA SCHEDE ───
  const configTypes = useMemo(() => {
    const categoriesToShow: any[] = [];
    
    AGENDA_CATEGORIES.forEach(cat => {
      cat.items.forEach(item => {
        // Logica Visibilità Intelligente
        let shouldShow = false;
        
        // 1. Sempre visibili (Essenziali)
        const alwaysVisible = ["0015", "0016", "0010", "0014", "RR", "0037", "RP", "0009", "MALATTIA", "MALATT"];
        if (alwaysVisible.includes(item.code) || alwaysVisible.includes(item.shortCode)) shouldShow = true;
        
        // 2. Basati su Entitlements (Abilitazioni Profilo)
        if (item.shortCode.startsWith("104") && agent?.hasL104) shouldShow = true;
        if (item.shortCode === "STUDIO" && agent?.hasStudyLeave) shouldShow = true;
        if (cat.group === "Congedi" && agent?.hasParentalLeave) shouldShow = true;
        if (item.shortCode === "MAL_FI" && agent?.hasChildSicknessLeave) shouldShow = true;
        
        // 3. Basati sull'Utilizzo (Se ha almeno 1 giorno/ora usati)
        let used = 0;
        if (item.unit === "HOURS") {
           used = balancesData?.usage?.agendaSums?.filter((s:any) => s.userId === userId && s.code === item.code).reduce((acc:any, curr:any) => acc + (curr._sum.hours || 0), 0) || 0;
        } else {
           used = balancesData?.usage?.shiftsCount?.filter((s:any) => s.userId === userId && s.type === item.code).reduce((acc:any, curr:any) => acc + curr._count._all, 0) || 0;
        }
        if (used > 0) shouldShow = true;

        if (shouldShow) {
          categoriesToShow.push({
            code: item.code,
            shortCode: item.shortCode,
            label: item.label,
            unit: item.unit,
            group: cat.group,
            color: cat.color,
            fallback: (item.code === "0015" || item.shortCode === "FERIE") ? "32" : (item.shortCode === "FEST_S" ? "4" : "0"),
            isTrackerOnly: (cat.group === "Malattia" || cat.group === "Altro" || cat.group === "Recupero e Straord.") && item.shortCode !== "RR" && item.shortCode !== "RP"
          });
        }
      });
    });
    
    return categoriesToShow;
  }, [agent, balancesData, userId])

  const agentBalance = balancesData?.balances?.find((b:any) => b.userId === userId)
  const shiftsCount = balancesData?.usage?.shiftsCount || []

  // Initialize editable states
  const [editable, setEditable] = useState<Record<string, string>>(() => {
     const init: Record<string, string> = {}
     configTypes.forEach(ct => {
        const typeMatch = [ct.code, ct.shortCode];
        const detail = agentBalance?.details?.find((bd:any) => bd.code === ct.code) || 
                       agentBalance?.details?.find((bd:any) => typeMatch.includes(bd.code))
        init[ct.code] = detail ? detail.initialValue.toString() : ct.fallback
     })
     return init
  })

  // ─── CALCOLI TOTALI ───
  const calculations = useMemo(() => {
     return configTypes.map(ct => {
        let used = 0;
        // Backend harmonization match: recognizes both specific code and normalized shortCode
        const typeMatch = [ct.code, ct.shortCode];
        
        if (ct.unit === 'HOURS') {
           used = balancesData?.usage?.agendaSums?.filter((s:any) => s.userId === userId && typeMatch.includes(s.code)).reduce((acc:any, curr:any) => acc + (curr._sum.hours || 0), 0) || 0;
        } else {
           used = shiftsCount?.filter((s:any) => s.userId === userId && typeMatch.includes(s.type)).reduce((acc:any, curr:any) => acc + curr._count._all, 0) || 0;
        }
        
        const initial = parseFloat(editable[ct.code] || "0");
        const residue = ct.isTrackerOnly ? null : Math.max(0, initial - used);
        return { ...ct, used, residue, initial, typeMatch };
     });
  }, [configTypes, editable, balancesData, shiftsCount, userId])

  const handleSave = async () => {
    setSaving(true)
    const updates = configTypes.map(ct => ({
       userId: userId,
       code: ct.code,
       label: ct.label,
       initialValue: parseFloat(editable[ct.code] || "0"),
       unit: ct.unit
    }))

    try {
      const res = await fetch("/api/admin/balances", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: currentYear, updates })
      })
      if (!res.ok) throw new Error("Errore nel salvataggio")
      const data = await res.json()
      if (!data.success) throw new Error(data.error || "Errore sconosciuto")
      toast.success("Saldi aggiornati correttamente!")
      onRefresh()
    } catch (err: any) {
      toast.error("Errore: " + err.message)
    } finally {
      setSaving(false)
    }
  }

  // ─── LOGICA DETTAGLIO MENSILE ───
  const renderMonthlyDetail = () => {
    if (loadingDetail) return <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4"><Activity className="text-white animate-spin" size={32} /></div>
    if (!detailTarget) return null

    const months = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"]
    const monthlyData = months.map((m, idx) => {
      const monthShifts = monthlyDetailData?.monthlyShifts?.filter((s:any) => detailTarget.typeMatch.includes(s.type) && new Date(s.date).getMonth() === idx) || []
      const monthAgenda = monthlyDetailData?.monthlyAgenda?.filter((s:any) => detailTarget.typeMatch.includes(s.code) && new Date(s.date).getMonth() === idx) || []
      
      const count = monthShifts.length
      const hours = monthAgenda.reduce((acc:any, curr:any) => acc + (curr.hours || 0), 0)

      // Logica L.104 Mode
      let l104Mode = null
      const is104 = detailTarget.shortCode?.startsWith('104') || detailTarget.typeMatch?.some((t:any) => t.startsWith('104'));
      if (is104 && (count > 0 || hours > 0)) {
         // Se c'è almeno un'entrata oraria (104_1H/2H), allora è HOURS
         const hasHourly = monthAgenda.some((a:any) => a.code.includes('H')) || monthShifts.some((s:any) => s.type.includes('H'))
         l104Mode = hasHourly ? 'ORE' : 'GIORNI'
      }

      return { name: m, count, hours, l104Mode }
    })

    const headerColor = {
       amber: 'bg-amber-600',
       rose: 'bg-rose-600',
       blue: 'bg-blue-600',
       red: 'bg-red-600',
       teal: 'bg-teal-600',
       indigo: 'bg-indigo-600'
    }[detailTarget.color as string] || 'bg-slate-600';

    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
         <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className={`p-6 ${headerColor} text-white flex justify-between items-center`}>
               <div>
                  <h3 className="text-xl font-black uppercase tracking-widest">{detailTarget.label}</h3>
                  <p className="text-white/70 text-xs font-bold mt-1">Dettaglio Mensile {currentYear}</p>
               </div>
               <button onClick={() => setDetailTarget(null)} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                  <X size={24} />
               </button>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
               <div className="space-y-2">
                  {monthlyData.map((m, i) => (
                     <div key={m.name} className={`flex items-center justify-between p-4 rounded-xl border ${m.count > 0 || m.hours > 0 ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-100 opacity-40'}`}>
                        <div className="flex items-center gap-3">
                           <span className="text-[10px] font-black text-slate-400 w-6">{String(i+1).padStart(2, '0')}</span>
                           <span className="font-black text-slate-700 text-sm">{m.name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                           {m.l104Mode && (
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${m.l104Mode === 'ORE' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                 MOD: {m.l104Mode}
                              </span>
                           )}
                           <div className="text-right">
                              <span className="font-black text-lg text-slate-900">
                                 {detailTarget.unit === 'HOURS' ? m.hours : m.count}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400 ml-1 uppercase">{detailTarget.unit === 'HOURS' ? 'ore' : 'gg'}</span>
                           </div>
                        </div>
                     </div>
                  ))}
               </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
               <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">Totale Utilizzato</p>
                  <p className="text-xl font-black text-slate-900">{detailTarget.used} {detailTarget.unit === 'HOURS' ? 'Ore' : 'Giorni'}</p>
               </div>
               <button onClick={() => setDetailTarget(null)} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all">Chiudi</button>
            </div>
         </div>
      </div>
    )
  }

  const straordinariTot = balancesData?.usage?.overtimeSums?.filter((s:any)=>s.userId === userId).reduce((acc:any, curr:any) => acc + curr._sum.overtimeHours, 0) || 0
  const recuperiCount = balancesData?.usage?.agendaSums?.filter((s:any)=>s.userId === userId && (s.code === '0009' || s.code === '0067' || s.code === '0081')).reduce((acc:any, curr:any) => acc + curr._count._all, 0) || 0

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
       {renderMonthlyDetail()}
       <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">
          <div className="p-6 md:p-8 bg-slate-900 text-white relative overflow-hidden flex justify-between items-center">
             <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
             <div className="relative z-10">
                <h3 className="text-2xl font-black">Spettanze Annuali {currentYear}</h3>
                <p className="text-slate-400 text-sm mt-1 max-w-xl">Gestione massimali operatore. Clicca su una scheda per vedere il dettaglio mensile.</p>
             </div>
             <button onClick={handleSave} disabled={saving} className="hidden md:flex relative z-10 items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 transition-all active:scale-95 disabled:opacity-50">
               {saving ? <Activity size={18} className="animate-spin" /> : <Save size={18} />} Salva
             </button>
          </div>
          
          <div className="p-6 md:p-8 bg-slate-50 space-y-10">
             {AGENDA_CATEGORIES.map(category => {
               const groupItems = calculations.filter(c => c.group === category.group);
               if (groupItems.length === 0) return null;

               return (
                 <div key={category.group} className="space-y-4">
                    <div className="flex items-center gap-3 px-2">
                       <span className="text-xl">{category.emoji}</span>
                       <h4 className="text-sm font-black uppercase tracking-widest text-slate-400">{category.group}</h4>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                       {groupItems.map(calc => (
                          <div 
                             key={calc.code} 
                             onClick={() => setDetailTarget(calc)}
                             className={`group bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all relative overflow-hidden cursor-pointer border-l-4`}
                             style={{ borderLeftColor: {
                                amber: '#f59e0b',
                                rose: '#e11d48',
                                blue: '#0284c7',
                                red: '#dc2626',
                                teal: '#0d9488',
                                indigo: '#4f46e5',
                                sky: '#0284c7'
                             }[calc.color as string] || '#64748b' }}
                          >
                             <div className="flex justify-between items-baseline mb-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-800 leading-tight pr-4">{calc.label}</p>
                                <span className="text-[8px] font-black text-slate-300 uppercase underline group-hover:text-indigo-500 shrink-0">Dettaglio</span>
                             </div>
                             
                             <div className="space-y-4">
                                <div onClick={e => e.stopPropagation()}>
                                   <p className="text-[9px] uppercase tracking-widest text-slate-400 mb-1 font-bold">{calc.isTrackerOnly ? 'Totale Fruito' : 'Spettanti (Modificabile)'}</p>
                                   {calc.isTrackerOnly ? (
                                      <div className="w-full text-2xl font-black bg-slate-100/50 border border-transparent rounded-xl px-4 py-2 text-slate-500 opacity-60">0</div>
                                   ) : (
                                      <input 
                                         type="number" min="0"
                                         value={editable[calc.code]}
                                         onChange={e => setEditable({...editable, [calc.code]: e.target.value})}
                                         className="w-full text-2xl font-black bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:outline-none focus:border-indigo-500 focus:bg-white text-indigo-900 transition-all shadow-inner"
                                      />
                                   )}
                                </div>
                                <div className="flex gap-4 pt-4 border-t border-slate-100">
                                   <div className="flex-1">
                                      <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Consumate</p>
                                      <p className="text-xl font-black text-rose-500">{calc.used}</p>
                                   </div>
                                   {!calc.isTrackerOnly && (
                                      <>
                                         <div className="w-px bg-slate-100"></div>
                                         <div className="flex-1 text-right">
                                            <p className="text-[9px] uppercase tracking-widest text-indigo-400 font-bold">Residuo</p>
                                            <p className={`text-2xl font-black ${calc.residue <= 0 ? 'text-rose-600' : 'text-indigo-600'}`}>{calc.residue}</p>
                                         </div>
                                      </>
                                   )}
                                </div>
                             </div>
                          </div>
                       ))}
                    </div>
                 </div>
               );
             })}
          </div>
       </div>

       {/* INFORMATIVE BLOCKS */}
       <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-emerald-200 transition-colors">
             <div className="absolute -top-4 -right-4 p-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all"><Clock size={140} /></div>
             <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-2">Banca Ore / Straordinari {currentYear}</p>
             <h4 className="text-5xl font-black text-emerald-600 mb-2">{straordinariTot} <span className="text-base text-emerald-400 font-bold uppercase tracking-widest">ore maturate</span></h4>
             <p className="text-xs font-medium text-slate-500 max-w-[200px] leading-relaxed">Conteggio delle ore extra valide effettuate oltre il normale orario di servizio.</p>
          </div>
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-amber-200 transition-colors">
             <div className="absolute -top-4 -right-4 p-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all"><WalletCards size={140} /></div>
             <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-2">Riposi / Recupero Compensativo</p>
             <h4 className="text-5xl font-black text-slate-800 mb-2">{recuperiCount} <span className="text-base text-slate-400 font-bold uppercase tracking-widest">eventi sfruttati</span></h4>
             <p className="text-xs font-medium text-slate-500 max-w-[200px] leading-relaxed">Volte in cui l'operatore ha consumato permessi o riposi compensativi nell'anno in corso.</p>
          </div>
       </div>
    </div>
  )
}

function AgentDossierRichieste({ userId, currentYear }: { userId: string, currentYear: number }) {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Re-use an existing endpoint if possible. We have global requests if we fetch /api/swaps and /api/requests?
    // Wait, the easiest way is to use the /api/admin/balances, or let's create a quick fetch inside `routes.ts` or just fetch /api/requests
    // Actually, Admin has an endpoint: GET /api/requests
    Promise.all([
      fetch(`/api/requests?userId=${userId}`).then(r => r.json()).catch(() => ({ requests: [] })),
      fetch(`/api/swaps?userId=${userId}`).then(r => r.json()).catch(() => ({ swaps: [] }))
    ]).then(([reqData, swapData]) => {
      // Unify requests and swaps for this user
      // Note: we'll filter them correctly
      let combined: any[] = []
      
      if (reqData && reqData.requests) {
        combined = [...combined, ...reqData.requests.filter((r:any) => r.userId === userId).map((r:any) => ({ ...r, __type: 'absence' }))]
      }
      if (swapData && swapData.swaps) {
        // Swaps involving this user
        combined = [...combined, ...swapData.swaps.filter((s:any) => s.requesterId === userId || s.receiverId === userId).map((s:any) => ({ ...s, __type: 'swap' }))]
      }
      
      // Sort by date created or handled
      combined.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      setRequests(combined)
    }).finally(() => setLoading(false))
  }, [userId])

  if (loading) return <div className="flex justify-center py-12"><Activity className="animate-spin text-indigo-400" size={24} /></div>

  if (requests.length === 0) {
    return (
       <div className="text-center py-24 text-slate-400">
          <FileStack size={48} className="mx-auto mb-4 opacity-30" />
          <p className="font-bold uppercase tracking-widest text-sm">Nessuna richiesta o scambio.</p>
       </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
       <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-start gap-4 mb-8">
          <Info className="text-indigo-500 shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="font-bold text-indigo-900 text-sm">Registro Richieste</h4>
            <p className="text-xs text-indigo-700/70 mt-1 font-medium">Archivio delle richieste di assenza e proposte di cambio turno effettuate o ricevute dall'operatore.</p>
          </div>
       </div>

       <div className="space-y-4">
          {requests.map(req => {
            const isSwap = req.__type === 'swap'
            const isRequester = isSwap && req.requesterId === userId
            const title = isSwap ? (isRequester ? "Scambio Inviato" : "Scambio Ricevuto") : "Richiesta Assenza"
            const statusLabel = 
               req.status === 'PENDING' ? 'IN ATTESA' :
               req.status === 'APPROVED' ? 'APPROVATA' :
               req.status === 'REJECTED' ? 'RIFIUTATA' : 'ANNULLATA'

            const statusColors = 
               req.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
               req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
               req.status === 'REJECTED' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'

            return (
               <div key={req.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-3">
                     <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">{isSwap ? title : (getLabel(req.code) || title)}</p>
                     <p className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${statusColors}`}>
                        {statusLabel}
                     </p>
                  </div>
                  <div>
                     <p className="font-bold text-slate-900 font-black text-sm mb-1">Data: {new Date(req.date || req.createdAt).toLocaleDateString('it-IT')}</p>
                     <p className="text-sm font-medium text-slate-500 italic">"{req.reason || 'Senza nota'}"</p>
                  </div>
               </div>
            )
          })}
       </div>
    </div>
  )
}

