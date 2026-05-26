"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { ShieldAlert, Plus, MapPin, Calendar, Clock, ChevronRight } from "lucide-react"
import { useRouter, useParams } from "next/navigation"
import { format } from "date-fns"
import { it } from "date-fns/locale"

export default function AgentAccidentsList() {
  const router = useRouter()
  const params = useParams()
  const [accidents, setAccidents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAccidents = async () => {
      try {
        const res = await fetch("/api/agent/accidents")
        if (res.ok) {
          const data = await res.json()
          setAccidents(data)
        }
      } catch (error) {
        console.error("Error fetching accidents", error)
      } finally {
        setLoading(false)
      }
    }
    fetchAccidents()
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "BOZZA": return "bg-gray-100 text-gray-700 border-gray-200"
      case "IN_COMPILAZIONE": return "bg-blue-100 text-blue-700 border-blue-200"
      case "REVISIONATO": return "bg-yellow-100 text-yellow-700 border-yellow-200"
      case "CHIUSO": return "bg-green-100 text-green-700 border-green-200"
      default: return "bg-gray-100 text-gray-700 border-gray-200"
    }
  }

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case "SOLO_DANNI": return "Danni a Cose"
      case "FERITI": return "Con Feriti"
      case "RISERVA_PROGNOSI": return "Prognosi Riservata"
      case "MORTALE": return "Mortale"
      default: return severity
    }
  }

  return (
    <div className="p-4 pb-24 space-y-4">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-red-600" />
          <h1 className="text-xl font-bold text-slate-800">I Miei Sinistri</h1>
        </div>
        <button 
          onClick={() => router.push(`/${params.tenantSlug}/agent/sinistri/nuovo`)}
          className="bg-red-600 text-white p-2 rounded-full shadow-md shadow-red-200"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {loading ? (
        <div className="text-center p-8 text-gray-500">Caricamento in corso...</div>
      ) : accidents.length === 0 ? (
        <div className="text-center p-8 bg-gray-50 rounded-xl border border-gray-100">
          <ShieldAlert className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nessun sinistro rilevato</p>
        </div>
      ) : (
        <div className="space-y-3">
          {accidents.map(a => (
            <div 
              key={a.id} 
              onClick={() => router.push(`/${params.tenantSlug}/agent/sinistri/${a.id}`)}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col gap-3 active:scale-[0.98] transition-transform cursor-pointer"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-slate-800">{a.protocolNumber || "Sinistro"}</h3>
                  <p className="text-xs text-gray-500 font-medium">{getSeverityLabel(a.severity)}</p>
                </div>
                <span className={`text-[10px] px-2 py-1 rounded-full font-bold border ${getStatusColor(a.status)}`}>
                  {a.status.replace('_', ' ')}
                </span>
              </div>

              <div className="flex flex-col gap-1.5 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-red-400 shrink-0" />
                  <span className="truncate">{a.address}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>{format(new Date(a.date), "dd MMMM yyyy, HH:mm", { locale: it })}</span>
                </div>
              </div>

              <div className="pt-3 mt-1 border-t border-gray-50 flex justify-between items-center">
                <div className="text-xs text-gray-500 flex items-center gap-2">
                  <span>Veicoli: <b className="text-slate-700">{a.vehicles?.length || 0}</b></span>
                  <span>Persone: <b className="text-slate-700">{a.people?.length || 0}</b></span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
