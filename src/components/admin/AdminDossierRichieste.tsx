"use client"

import { useState, useEffect } from "react"
import { Activity, FileStack, Info } from "lucide-react"
import { getLabel } from "@/utils/agenda-codes"

export function AdminDossierRichieste({ userId, currentYear }: { userId: string, currentYear: number }) {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`/api/requests?userId=${userId}`).then(r => r.json()).catch(() => ({ requests: [] })),
      fetch(`/api/swaps?userId=${userId}`).then(r => r.json()).catch(() => ({ swaps: [] }))
    ]).then(([reqData, swapData]) => {
      let combined: any[] = []
      
      if (reqData && reqData.requests) {
        combined = [...combined, ...reqData.requests.filter((r:any) => r.userId === userId).map((r:any) => ({ ...r, __type: 'absence' }))]
      }
      if (swapData && swapData.swaps) {
        combined = [...combined, ...swapData.swaps.filter((s:any) => s.requesterId === userId || s.receiverId === userId).map((s:any) => ({ ...s, __type: 'swap' }))]
      }
      
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
