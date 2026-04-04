"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, XCircle, Clock, CalendarDays, Inbox } from "lucide-react"
import toast from "react-hot-toast"

export default function GestioneRichiestePage() {
  const router = useRouter()
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/absence-requests?status=PENDING")
      if (res.ok) {
        setRequests(await res.json())
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (id: string, status: "APPROVED" | "REJECTED") => {
    try {
      const res = await fetch(`/api/admin/absence-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      })

      if (res.ok) {
        toast.success(status === "APPROVED" ? "Richiesta Approvata ed inserita in Calendario!" : "Richiesta Rifiutata")
        fetchRequests()
        router.refresh()
      } else {
        const error = await res.json()
        toast.error(error.error || "Errore durante l'operazione")
      }
    } catch (err) {
      toast.error("Errore di rete")
    }
  }

  return (
    <div className="p-6 lg:p-8 relative z-10 h-full">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <Inbox className="text-blue-600" size={32} />
          Inbox Segreteria
        </h1>
        <p className="text-sm text-slate-500 mt-1 font-medium">Gestione approvazioni ferie, permessi e malattie inoltrate dagli agenti.</p>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden min-h-[500px]">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Clock size={20} className="text-amber-500" /> Da Processare ({requests.length})
          </h2>
          <button onClick={fetchRequests} className="text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">
            Aggiorna
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-20 text-slate-400 font-bold">Caricamento in corso...</div>
          ) : requests.length === 0 ? (
            <div className="text-center py-20 flex flex-col items-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-300">
                <CheckCircle2 size={32} />
              </div>
              <p className="text-lg font-black text-slate-600">Nessuna richiesta in attesa</p>
              <p className="text-slate-400 text-sm">Hai processato tutte le notifiche.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map(req => (
                <div key={req.id} className="border border-slate-200 bg-white hover:bg-blue-50/50 rounded-2xl p-5 shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-6">
                  
                  {/* Info Box */}
                  <div className="flex gap-4 items-start">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex flex-col items-center justify-center shrink-0">
                      <CalendarDays size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-black text-slate-900">{req.user?.name || "Agente Sconosciuto"}</span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-black border border-slate-200">Matr. {req.user?.matricola}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold px-2 py-1 bg-amber-100 text-amber-800 rounded-md border border-amber-200 uppercase tracking-wide">
                          {req.code}
                        </span>
                        <span className="text-sm font-semibold text-slate-600">
                          {new Date(req.date).toLocaleDateString('it-IT')} 
                          {req.endDate && ` al ${new Date(req.endDate).toLocaleDateString('it-IT')}`}
                        </span>
                      </div>
                      {req.notes && (
                        <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 mt-2 italic shadow-inner">
                          &quot;{req.notes}&quot;
                        </p>
                      )}
                      <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-widest">Inoltrata il: {new Date(req.createdAt).toLocaleString('it-IT')}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 md:border-l md:border-slate-100 md:pl-6">
                    <button 
                      onClick={() => handleAction(req.id, "REJECTED")}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white border-2 border-red-100 text-red-600 hover:bg-red-50 hover:border-red-200 rounded-xl font-black text-sm transition-all"
                    >
                      <XCircle size={18} /> Rifiuta
                    </button>
                    <button 
                      onClick={() => handleAction(req.id, "APPROVED")}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200 rounded-xl font-black text-sm transition-all"
                    >
                      <CheckCircle2 size={18} /> Approva (Applica OdS)
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
