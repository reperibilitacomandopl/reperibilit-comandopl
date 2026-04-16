"use client"

import { useState, useEffect } from "react"
import { Phone, BellRing, ShieldAlert, AlertTriangle } from "lucide-react"

interface DutyAgent {
  id: string
  name: string
  matricola: string
  phone?: string | null
  qualifica?: string | null
  gradoLivello?: number
  repType?: string | null
}

export default function OfficerDutyPanel() {
  const [dutyTeam, setDutyTeam] = useState<DutyAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [accessDenied, setAccessDenied] = useState(false)

  const [isAlerting, setIsAlerting] = useState(false)

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const res = await fetch("/api/officer/duty-team")
        if (res.status === 403) {
          setAccessDenied(true)
          setLoading(false)
          return
        }
        if (!res.ok) throw new Error()
        const data = await res.json()
        setDutyTeam(data.team || [])
      } catch (err) {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    fetchTeam()
  }, [])

  const handleSendAlarm = async () => {
    if (!confirm("🚨 ATTENZIONE 🚨\nSei sicuro di voler diramare un ALLARME GENERALE a tutti i reperibili?")) return;
    
    setIsAlerting(true)
    try {
      const res = await fetch("/api/admin/alert-emergency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: "🚨 URGENZA! L'Ufficiale di Servizio ha attivato l'allarme generale. Recarsi in comando immediatamente."
        })
      })
      const data = await res.json()
      if (res.ok) {
        alert(`✅ Allarme Inviato a ${data.alerted || 0} reperibili!`)
      } else {
        alert(data.error || "Errore nell'invio dell'allarme")
      }
    } catch {
      alert("Errore di connessione")
    } finally {
      setIsAlerting(false)
    }
  }

  // Se è 403 (non è l'ufficiale di turno), non mostriamo nulla o mostriamo un messaggio
  // Ma di solito nascondiamo il pannello se non ha accesso
  if (!loading && accessDenied) return null;
  if (!loading && dutyTeam.length === 0) return null; // Nascondi se non ci sono reperibili

  return (
    <div className="bg-slate-900 rounded-[2rem] p-6 sm:p-8 shadow-2xl relative overflow-hidden border border-slate-700">
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

      <div className="relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-700 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
              <ShieldAlert className="text-indigo-400" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">Squadra di Reperibilità</h2>
              <p className="text-xs font-bold text-indigo-300 uppercase tracking-widest">Oggi in Servizio</p>
            </div>
          </div>

          <button 
            disabled={isAlerting}
            onClick={handleSendAlarm}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white px-5 py-3 rounded-xl font-black text-sm uppercase tracking-widest shadow-xl shadow-rose-900/40 transition-all active:scale-95 disabled:opacity-50"
          >
            {isAlerting ? <AlertTriangle className="animate-spin" size={18} /> : <BellRing size={18} />}
            Lancia Allarme
          </button>
        </div>

        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-16 bg-slate-800 rounded-xl w-full"></div>
            <div className="h-16 bg-slate-800 rounded-xl w-full"></div>
          </div>
        ) : error ? (
          <div className="text-rose-400 text-sm font-bold bg-rose-900/20 p-4 rounded-xl border border-rose-900/50">
            Errore nel caricamento della squadra.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {dutyTeam.map((agent) => (
              <div key={agent.id} className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-2xl p-4 transition-all flex items-center justify-between gap-4 group">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-0.5">{agent.qualifica || "Agente"}</span>
                  <span className="text-sm font-black text-white">{agent.name}</span>
                  {agent.repType && <span className="text-[9px] font-bold text-indigo-400 mt-1">{agent.repType}</span>}
                </div>
                
                {agent.phone ? (
                  <a href={`tel:${agent.phone}`} className="w-10 h-10 rounded-full bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white flex items-center justify-center transition-all shrink-0 border border-emerald-500/20 shadow-md">
                    <Phone size={16} className="fill-current" />
                  </a>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-700/50 flex items-center justify-center shrink-0 border border-slate-600/50" title="Numero non inserito">
                    <Phone size={16} className="text-slate-500" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
