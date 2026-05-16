"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Shield, MapPin, CheckCircle, Navigation as NavIcon, Clock, AlertTriangle } from "lucide-react"
import toast from "react-hot-toast"

export default function AgentInterventions() {
  const { data: session } = useSession()
  const [interventions, setInterventions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchInterventions = async () => {
    try {
      const res = await fetch("/api/agent/interventions")
      if (res.ok) {
        const data = await res.json()
        setInterventions(data)
      }
    } catch (error) {
      console.error("Fetch interventions error", error)
    } finally {
      setLoading(false)
    }
  }

  // Polling per controllare nuovi interventi assegnati
  useEffect(() => {
    fetchInterventions()
    const interval = setInterval(fetchInterventions, 10000)
    return () => clearInterval(interval)
  }, [])

  const updateStatus = async (id: string, action: string) => {
    try {
      const res = await fetch("/api/agent/interventions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action })
      })
      if (res.ok) {
        toast.success("Stato aggiornato")
        fetchInterventions()
      } else {
        toast.error("Impossibile aggiornare lo stato")
      }
    } catch (error) {
      toast.error("Errore di rete")
    }
  }

  const handleNavigate = (lat: number, lng: number) => {
    // Genera URL per Google Maps o app nativa
    window.open(`geo:${lat},${lng}?q=${lat},${lng}`, '_system')
  }

  if (loading) return <div className="p-4 text-center">Caricamento...</div>

  return (
    <div className="p-4 pb-24 space-y-4">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="w-6 h-6 text-blue-600" />
        <h1 className="text-xl font-bold text-slate-800">Missioni Assegnate</h1>
      </div>

      {interventions.length === 0 ? (
        <div className="text-center p-8 bg-gray-50 rounded-xl border border-gray-100">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nessun intervento attivo</p>
          <p className="text-sm text-gray-400">La centrale non ha inviato missioni.</p>
        </div>
      ) : (
        interventions.map(i => (
          <div key={i.id} className={`bg-white rounded-xl shadow-md overflow-hidden border-t-4 ${i.priority === 'RED' ? 'border-red-500' : i.priority === 'YELLOW' ? 'border-yellow-500' : 'border-green-500'}`}>
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h2 className="font-bold text-lg text-slate-800">{i.type}</h2>
                <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${
                  i.priority === 'RED' ? 'bg-red-100 text-red-700 animate-pulse' : 
                  i.priority === 'YELLOW' ? 'bg-yellow-100 text-yellow-700' : 
                  'bg-green-100 text-green-700'
                }`}>
                  {i.priority === 'RED' ? 'Emergenza' : i.priority === 'YELLOW' ? 'Urgente' : 'Ordinario'}
                </span>
              </div>
              
              <div className="flex items-start gap-2 text-gray-600 mt-3">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" />
                <p className="text-sm">{i.address}</p>
              </div>

              {i.description && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-700 border border-gray-100">
                  {i.description}
                </div>
              )}

              <div className="mt-4 pt-4 border-t flex flex-col gap-2">
                {i.status === 'DISPATCHED' && (
                  <button onClick={() => updateStatus(i.id, 'ACCEPT')} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200">
                    <CheckCircle className="w-5 h-5" /> Accetta Missione
                  </button>
                )}

                {i.status === 'ACCEPTED' && (
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => i.lat && handleNavigate(i.lat, i.lng)} className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center gap-2">
                      <NavIcon className="w-5 h-5" /> Naviga
                    </button>
                    <button onClick={() => updateStatus(i.id, 'ARRIVE')} className="w-full py-3 bg-yellow-500 text-white rounded-xl font-bold flex items-center justify-center gap-2">
                      <MapPin className="w-5 h-5" /> Sul Posto
                    </button>
                  </div>
                )}

                {i.status === 'ON_SITE' && (
                  <button onClick={() => updateStatus(i.id, 'COMPLETE')} className="w-full py-3 bg-green-500 text-white rounded-xl font-bold flex items-center justify-center gap-2">
                    <CheckCircle className="w-5 h-5" /> Intervento Terminato
                  </button>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
