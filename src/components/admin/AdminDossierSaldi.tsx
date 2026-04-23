"use client"

import { useState, useMemo } from "react"
import { Activity, WalletCards, Clock, Save, X } from "lucide-react"
import { AGENDA_CATEGORIES } from "@/utils/agenda-codes"
import { toast } from "react-hot-toast"

export function AdminDossierSaldi({ userId, agent, balancesData, currentYear, onRefresh }: { userId: string, agent: any, balancesData: any, currentYear: number, onRefresh: () => void }) {
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
                             onClick={() => openDetail(calc)}
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
