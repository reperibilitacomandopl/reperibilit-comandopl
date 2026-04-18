"use client"

import { useState, useEffect } from "react"
import { WalletCards, Clock, CheckCircle2, TrendingUp, AlertTriangle } from "lucide-react"

export default function PersonalBalances() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/agent/balances")
      .then(res => res.json())
      .then(d => {
        if (!d.error) setData(d)
      })
      .finally(() => setLoading(false))
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
    const detail = data.balance.details.find((d: any) => d.code === code)
    return detail ? detail.initialValue : 0
  }

  const getFerieCount = () => {
    // Cerchiamo l'assenza "FERIE" o "0015" nei consumi
    return data.usage?.shiftsCount?.filter((s:any) => s.type === "FERIE" || s.type === "0015").reduce((acc:any, curr:any) => acc + curr._count._all, 0) || 0
  }
  const getFerieAPCount = () => {
    return data.usage?.shiftsCount?.filter((s:any) => s.type === "FERIE_AP" || s.type === "0016").reduce((acc:any, curr:any) => acc + curr._count._all, 0) || 0
  }

  const initialFerie = findInitialValue("0015") || findInitialValue("FERIE") || 32
  const initialFerieAP = findInitialValue("0016") || findInitialValue("FERIE_AP") || 0
  
  const ferieUtilizzate = getFerieCount()
  const ferieAPUtilizzate = getFerieAPCount()

  const ferieResidue = initialFerie - ferieUtilizzate
  const ferieAPResidue = Math.max(0, initialFerieAP - ferieAPUtilizzate)

  const feriePercent = Math.min(100, Math.max(0, (ferieUtilizzate / initialFerie) * 100))

  return (
    <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
      
      <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-cyan-100 rounded-2xl">
            <WalletCards size={24} className="text-cyan-600" />
          </div>
          <div>
            <h3 className="font-black text-xl text-slate-900">I Miei Saldi</h3>
            <p className="text-xs text-slate-500 font-medium tracking-tight">Riepilogo Ferie, Permessi e Monte Ore {data.balance.year}</p>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
        
        {/* Ferie Correnti */}
        <div className="bg-gradient-to-br from-slate-900 to-[#0f172a] rounded-[1.5rem] p-6 shadow-2xl relative overflow-hidden text-white">
          <div className="absolute -right-4 -top-4 w-32 h-32 bg-cyan-500/20 rounded-full blur-2xl"></div>
          
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400 mb-1">Ferie Ordinarie</p>
              <h4 className="text-2xl font-black">{ferieResidue} <span className="text-sm text-slate-400">/ {initialFerie}</span></h4>
            </div>
            <div className="w-12 h-12 rounded-full border-4 border-slate-800 flex items-center justify-center font-black text-[10px] relative">
               <svg className="absolute inset-0 w-full h-full -rotate-90">
                 <circle cx="20" cy="20" r="18" fill="none" className="stroke-slate-800" strokeWidth="4" />
                 <circle cx="20" cy="20" r="18" fill="none" className="stroke-cyan-500 transition-all duration-1000" strokeWidth="4" strokeDasharray="113" strokeDashoffset={113 - (113 * feriePercent) / 100} strokeLinecap="round" />
               </svg>
               {Math.round(feriePercent)}%
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold bg-white/5 rounded-xl p-3">
             <div className="flex-1">
               <span className="text-slate-400 block text-[9px] uppercase tracking-widest">Spettanti</span>
               <span className="text-white">{initialFerie} g</span>
             </div>
             <div className="w-[1px] h-8 bg-white/10"></div>
             <div className="flex-1">
               <span className="text-slate-400 block text-[9px] uppercase tracking-widest">Godute</span>
               <span className="text-white">{ferieUtilizzate} g</span>
             </div>
             <div className="w-[1px] h-8 bg-white/10"></div>
             <div className="flex-1">
               <span className="text-cyan-400 block text-[9px] uppercase tracking-widest">Residuo</span>
               <span className="text-cyan-400">{ferieResidue} g</span>
             </div>
          </div>
        </div>

        {/* Ferie Anni Precedenti */}
        <div className="bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors rounded-[1.5rem] p-6 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
             <div>
               <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Ferie Anni Prec.</p>
               <h4 className="text-xl font-black text-slate-800">{ferieAPResidue} <span className="text-sm text-slate-400 font-medium tracking-tight">giorni residui</span></h4>
             </div>
             <div className="p-2 bg-slate-200 rounded-xl">
               <CheckCircle2 size={18} className="text-slate-500" />
             </div>
          </div>
          <div className="text-xs text-slate-500 font-bold bg-white p-3 rounded-xl shadow-sm border border-slate-100">
             Iniziali: <span className="text-slate-800">{initialFerieAP}</span> | Utilizzate: <span className="text-slate-800">{ferieAPUtilizzate}</span>
          </div>
        </div>

        {/* Ore Straordinario */}
        <div className="bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors rounded-[1.5rem] p-6 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
             <div>
               <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Straordinari Totali</p>
               <h4 className="text-xl font-black text-emerald-600">{data.usage?.overtimeSums?._sum?.overtimeHours || 0} <span className="text-sm text-slate-400 font-medium tracking-tight">ore</span></h4>
             </div>
             <div className="p-2 bg-emerald-100 rounded-xl">
               <TrendingUp size={18} className="text-emerald-600" />
             </div>
          </div>
          <div className="text-[10px] uppercase tracking-widest text-emerald-700 font-black bg-emerald-50 p-3 rounded-xl border border-emerald-100 flex items-center justify-center gap-2">
             <Clock size={14} /> Monte ore ufficiale anno {data.balance.year}
          </div>
        </div>

        {/* Altri totalizzatori (Agenda, es: recuperi, 104) */}
        <div className="bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors rounded-[1.5rem] p-6 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
             <div>
               <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Assenze e Permessi</p>
               <h4 className="text-xl font-black text-slate-800">{data.usage?.agendaSums?.reduce((a:any, b:any) => a + (b._count?._all || 0), 0) || 0} <span className="text-sm text-slate-400 font-medium tracking-tight">eventi</span></h4>
             </div>
          </div>
          <div className="flex flex-wrap gap-2">
             {data.usage?.agendaSums?.map((sum: any) => (
                <div key={sum.code} className="text-[9px] font-black uppercase tracking-wider bg-white rounded-lg px-2 py-1 shadow-sm border border-slate-100">
                  {sum.code}: {sum._count._all}
                </div>
             ))}
             {data.usage?.agendaSums?.length === 0 && (
                <span className="text-[10px] font-bold text-slate-400">Nessun permesso registrato quest'anno.</span>
             )}
          </div>
        </div>

      </div>
    </div>
  )
}
