"use client"

import { useState, useEffect } from "react"
import { WalletCards, Clock, CheckCircle2, TrendingUp, AlertTriangle, ShieldCheck, GraduationCap } from "lucide-react"
import { getLabel, getCanonicalCode } from "@/utils/agenda-codes"

// Helper sicuro per evitare NaN
const safeNum = (val: any): number => {
  const n = Number(val)
  return isNaN(n) ? 0 : n
}

export default function PersonalBalances() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const [entitlements, setEntitlements] = useState<any>(null)

  useEffect(() => {
    Promise.all([
      fetch("/api/agent/balances").then(res => res.json()),
      fetch("/api/agent/entitlements").then(res => res.json())
    ]).then(([balancesData, entitlementsData]) => {
      if (!balancesData.error) setData(balancesData)
      if (!entitlementsData.error) setEntitlements(entitlementsData.status)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200 p-8 flex items-center justify-center min-h-[300px]">
        <div className="flex flex-col items-center animate-pulse">
           <WalletCards className="w-10 h-10 text-slate-200 mb-4" />
           <p className="text-xs font-black uppercase tracking-widest text-slate-300">Sincronizzazione Saldi...</p>
        </div>
      </div>
    )
  }

  if (!data || !data.balance) {
    return (
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200 p-8 flex flex-col items-center justify-center min-h-[300px] text-center">
        <AlertTriangle className="w-10 h-10 text-amber-400 mb-4" />
        <h3 className="font-black text-slate-800 text-lg">Saldi Non Inizializzati</h3>
        <p className="text-sm font-medium text-slate-500 mt-2 max-w-sm">
          Il tuo monte ore e ferie per quest'anno non è ancora stato caricato dall'Amministratore.
        </p>
      </div>
    )
  }

  const findInitialValue = (code: string) => {
    const detail = (data.balance.details || []).find((d: any) => d.code === code)
    return detail ? safeNum(detail.initialValue) : 0
  }

  const getFerieCount = () => {
    return (data.usage?.shiftsCount || []).filter((s:any) => s.type === "FERIE" || s.type === "0015").reduce((acc:any, curr:any) => acc + safeNum(curr._count?._all), 0)
  }
  const getFerieAPCount = () => {
    return (data.usage?.shiftsCount || []).filter((s:any) => s.type === "FERIE_AP" || s.type === "0016").reduce((acc:any, curr:any) => acc + safeNum(curr._count?._all), 0)
  }

  const initialFerie = findInitialValue("0015") || findInitialValue("FERIE") || 32
  const initialFerieAP = findInitialValue("0016") || findInitialValue("FERIE_AP") || 0
  
  const ferieUtilizzate = getFerieCount()
  const ferieAPUtilizzate = getFerieAPCount()

  const ferieResidue = initialFerie - ferieUtilizzate
  const ferieAPResidue = Math.max(0, initialFerieAP - ferieAPUtilizzate)

  const feriePercent = initialFerie > 0 ? Math.min(100, Math.max(0, (ferieUtilizzate / initialFerie) * 100)) : 0

  // Recupera TUTTI i saldi dal DB (balance.details) e rimuovi duplicati
  const rawDetails = data.balance.details || []
  const uniqueDetailsMap = new Map()
  for (const d of rawDetails) {
    const canonical = getCanonicalCode(d.code)
    uniqueDetailsMap.set(canonical, d)
  }
  const uniqueDetails = Array.from(uniqueDetailsMap.values())

  const allDetails = uniqueDetails.map((d: any) => {
    let dynamicUsed = 0;
    if (data.usage) {
       const canonical = getCanonicalCode(d.code)
       const shiftSum = (data.usage.shiftsCount || []).filter((s:any) => getCanonicalCode(s.type) === canonical).reduce((acc:any, curr:any) => acc + safeNum(curr._count?._all), 0)
       const agendaSum = (data.usage.agendaSums || []).filter((s:any) => getCanonicalCode(s.code) === canonical).reduce((acc:any, curr:any) => acc + safeNum(curr._count?._all), 0)
       dynamicUsed = shiftSum + agendaSum
    } else {
       dynamicUsed = safeNum(d.used)
    }

    return {
      ...d,
      initialValue: safeNum(d.initialValue),
      used: dynamicUsed,
      residue: safeNum(d.initialValue) - dynamicUsed
    }
  })

  // Filtra saldi extra (escludendo FERIE e FERIE_AP già mostrati sopra)
  const extraBalances = allDetails.filter((d: any) => 
    !["0015", "FERIE", "0016", "FERIE_AP"].includes(d.code) && (d.initialValue > 0 || d.used > 0)
  )

  return (
    <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
      
      <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-100/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-100 rounded-2xl">
            <WalletCards size={22} className="text-cyan-600" />
          </div>
          <div>
            <h3 className="font-black text-lg sm:text-xl text-slate-900">I Miei Saldi</h3>
            <p className="text-[10px] sm:text-xs text-slate-500 font-medium tracking-tight">Riepilogo Ferie, Permessi e Monte Ore {data.balance.year}</p>
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 relative z-10 max-h-[70vh] overflow-y-auto custom-scrollbar">
        
        {/* Ferie Correnti */}
        <div className="bg-gradient-to-br from-slate-900 to-[#0f172a] rounded-2xl sm:rounded-[1.5rem] p-4 sm:p-6 shadow-2xl relative overflow-hidden text-white">
          <div className="absolute -right-4 -top-4 w-32 h-32 bg-cyan-500/20 rounded-full blur-2xl"></div>
          
          <div className="flex justify-between items-start mb-4 sm:mb-6">
            <div>
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-cyan-400 mb-1">Ferie Ordinarie</p>
              <h4 className="text-xl sm:text-2xl font-black">{ferieResidue} <span className="text-sm text-slate-500">/ {initialFerie}</span></h4>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-4 border-slate-800 flex items-center justify-center font-black text-[9px] sm:text-[10px] relative shrink-0">
               <svg className="absolute inset-0 w-full h-full -rotate-90">
                 <circle cx="50%" cy="50%" r="40%" fill="none" className="stroke-slate-800" strokeWidth="4" />
                 <circle cx="50%" cy="50%" r="40%" fill="none" className="stroke-cyan-500 transition-all duration-1000" strokeWidth="4" strokeDasharray="113" strokeDashoffset={113 - (113 * feriePercent) / 100} strokeLinecap="round" />
               </svg>
               {Math.round(feriePercent)}%
            </div>
          </div>

          <div className="flex items-center gap-3 text-[10px] sm:text-xs font-bold bg-white/5 rounded-xl p-2.5 sm:p-3">
             <div className="flex-1 text-center">
               <span className="text-slate-500 block text-[8px] sm:text-[9px] uppercase tracking-widest">Spettanti</span>
               <span className="text-white font-black">{initialFerie} g</span>
             </div>
             <div className="w-[1px] h-6 sm:h-8 bg-white/10"></div>
             <div className="flex-1 text-center">
               <span className="text-slate-500 block text-[8px] sm:text-[9px] uppercase tracking-widest">Godute</span>
               <span className="text-white font-black">{ferieUtilizzate} g</span>
             </div>
             <div className="w-[1px] h-6 sm:h-8 bg-white/10"></div>
             <div className="flex-1 text-center">
               <span className="text-cyan-400 block text-[8px] sm:text-[9px] uppercase tracking-widest">Residuo</span>
               <span className="text-cyan-400 font-black">{ferieResidue} g</span>
             </div>
          </div>
        </div>

        {/* Ferie Anni Precedenti */}
        <div className="bg-slate-100 border border-slate-200 hover:border-slate-300 transition-colors rounded-2xl sm:rounded-[1.5rem] p-4 sm:p-6 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-3 sm:mb-4">
             <div>
               <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-slate-500 mb-1">Ferie Anni Prec.</p>
               <h4 className="text-lg sm:text-xl font-black text-slate-800">{ferieAPResidue} <span className="text-sm text-slate-500 font-medium">gg residui</span></h4>
             </div>
             <div className="p-2 bg-slate-200 rounded-xl shrink-0">
               <CheckCircle2 size={18} className="text-slate-500" />
             </div>
          </div>
          <div className="text-[10px] sm:text-xs text-slate-500 font-bold bg-white p-2.5 sm:p-3 rounded-xl shadow-sm border border-slate-100">
             Iniziali: <span className="text-slate-800">{initialFerieAP}</span> | Utilizzate: <span className="text-slate-800">{ferieAPUtilizzate}</span>
          </div>
        </div>

        {/* Ore Straordinario */}
        <div className="bg-slate-100 border border-slate-200 hover:border-slate-300 transition-colors rounded-2xl sm:rounded-[1.5rem] p-4 sm:p-6 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-3 sm:mb-4">
             <div>
               <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-slate-500 mb-1">Straordinari Totali</p>
               <h4 className="text-lg sm:text-xl font-black text-emerald-600">{safeNum(data.usage?.overtimeSums?._sum?.overtimeHours)} <span className="text-sm text-slate-500 font-medium">ore</span></h4>
             </div>
             <div className="p-2 bg-emerald-100 rounded-xl shrink-0">
               <TrendingUp size={18} className="text-emerald-600" />
             </div>
          </div>
          <div className="text-[9px] sm:text-[10px] uppercase tracking-widest text-emerald-700 font-black bg-emerald-50 p-2.5 sm:p-3 rounded-xl border border-emerald-100 flex items-center justify-center gap-2">
             <Clock size={14} /> Monte ore anno {data.balance.year}
          </div>
        </div>

        {/* Assenze e Permessi (totali agenda) */}
        <div className="bg-slate-100 border border-slate-200 hover:border-slate-300 transition-colors rounded-2xl sm:rounded-[1.5rem] p-4 sm:p-6 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-3 sm:mb-4">
             <div>
               <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-slate-500 mb-1">Assenze e Permessi</p>
               <h4 className="text-lg sm:text-xl font-black text-slate-800">{(data.usage?.agendaSums || []).reduce((a:any, b:any) => a + safeNum(b._count?._all), 0)} <span className="text-sm text-slate-500 font-medium">eventi</span></h4>
             </div>
          </div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
             {(data.usage?.agendaSums || []).map((sum: any) => (
                <div key={sum.code} className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider bg-white rounded-lg px-2 py-1 shadow-sm border border-slate-100">
                  {getLabel(sum.code) || sum.code}: {safeNum(sum._count?._all)}
                </div>
             ))}
             {(data.usage?.agendaSums || []).length === 0 && (
                <span className="text-[10px] font-bold text-slate-500">Nessun permesso registrato quest'anno.</span>
             )}
          </div>
        </div>

        {/* SALDI EXTRA dal DB (Festività, Motivi Personali, etc.) */}
        {extraBalances.map((det: any) => {
          const initial = safeNum(det.initialValue)
          const used = safeNum(det.used)
          const residue = initial - used
          const pct = initial > 0 ? Math.min(100, (used / initial) * 100) : 0
          const isWarning = pct > 80

          return (
            <div key={det.code} className="bg-slate-100 border border-slate-200 hover:border-slate-300 transition-colors rounded-2xl sm:rounded-[1.5rem] p-4 sm:p-6 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 mb-1">{det.label}</p>
                  <h4 className={`text-lg sm:text-xl font-black ${isWarning ? 'text-amber-600' : 'text-slate-800'}`}>
                    {residue} <span className="text-sm text-slate-500 font-medium">/ {initial} {det.unit === 'HOURS' ? 'ore' : 'gg'}</span>
                  </h4>
                </div>
                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded shrink-0 ${det.unit === 'HOURS' ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'}`}>
                  {det.unit === 'HOURS' ? 'ORE' : 'GG'}
                </span>
              </div>
              <div className="space-y-1.5">
                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-700 ${isWarning ? 'bg-amber-500' : 'bg-indigo-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[8px] sm:text-[9px] font-bold uppercase text-slate-400">
                  <span>Usati: {used}</span>
                  <span>Totale: {initial}</span>
                </div>
              </div>
            </div>
          )
        })}

      </div>

      {/* Diritti Speciali (L.104, Studio) */}
      {(entitlements?.hasL104 || entitlements?.hasStudyLeave) && (
        <div className="p-3 sm:p-6 pt-0 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 relative z-10">
           {entitlements?.hasL104 && (
             <div className="bg-blue-50 border border-blue-200 rounded-2xl sm:rounded-[1.5rem] p-4 sm:p-6 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start mb-3 sm:mb-4">
                  <div>
                    <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-blue-500 mb-1">Legge 104 / 92 (Mese Corrente)</p>
                    <h4 className="text-lg sm:text-xl font-black text-blue-900">
                      {safeNum(entitlements.l104Limit) - safeNum(entitlements.l104Used)} 
                      <span className="text-sm text-blue-400 font-medium ml-1">{entitlements.l104Mode === 'HOURS' ? 'ore residue' : 'gg residui'}</span>
                    </h4>
                  </div>
                  <div className="p-2 bg-blue-600 rounded-xl shadow-md shrink-0">
                    <ShieldCheck size={18} className="text-white" />
                  </div>
                </div>
                <div className="space-y-1.5">
                   <div className="flex justify-between text-[9px] sm:text-[10px] font-black uppercase text-blue-400">
                      <span>Utilizzati: {safeNum(entitlements.l104Used)} / {safeNum(entitlements.l104Limit)}</span>
                      <span>{safeNum(entitlements.l104Limit) > 0 ? Math.round((safeNum(entitlements.l104Used) / safeNum(entitlements.l104Limit)) * 100) : 0}%</span>
                   </div>
                   <div className="h-1.5 w-full bg-blue-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full transition-all duration-700" style={{ width: `${(safeNum(entitlements.l104Used) / Math.max(1, safeNum(entitlements.l104Limit))) * 100}%` }}></div>
                   </div>
                </div>
             </div>
           )}

           {entitlements?.hasStudyLeave && (
             <div className="bg-indigo-50 border border-indigo-200 rounded-2xl sm:rounded-[1.5rem] p-4 sm:p-6 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start mb-3 sm:mb-4">
                  <div>
                    <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-indigo-500 mb-1">Diritto allo Studio (Anno Corrente)</p>
                    <h4 className="text-lg sm:text-xl font-black text-indigo-900">
                      {safeNum(entitlements.studyLeaveLimit) - safeNum(entitlements.studyLeaveUsed)} 
                      <span className="text-sm text-indigo-400 font-medium ml-1">ore residue</span>
                    </h4>
                  </div>
                  <div className="p-2 bg-indigo-600 rounded-xl shadow-md shrink-0">
                    <GraduationCap size={18} className="text-white" />
                  </div>
                </div>
                <div className="space-y-1.5">
                   <div className="flex justify-between text-[9px] sm:text-[10px] font-black uppercase text-indigo-400">
                      <span>Utilizzate: {safeNum(entitlements.studyLeaveUsed)} / {safeNum(entitlements.studyLeaveLimit)}</span>
                      <span>{safeNum(entitlements.studyLeaveLimit) > 0 ? Math.round((safeNum(entitlements.studyLeaveUsed) / safeNum(entitlements.studyLeaveLimit)) * 100) : 0}%</span>
                   </div>
                   <div className="h-1.5 w-full bg-indigo-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-600 rounded-full transition-all duration-700" style={{ width: `${(safeNum(entitlements.studyLeaveUsed) / Math.max(1, safeNum(entitlements.studyLeaveLimit))) * 100}%` }}></div>
                   </div>
                </div>
             </div>
           )}
        </div>
      )}
    </div>
  )
}
