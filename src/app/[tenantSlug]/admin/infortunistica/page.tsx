"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { ShieldAlert, Search, Filter, FileText, ChevronRight, ArrowLeft, Home } from "lucide-react"
import { useRouter, useParams } from "next/navigation"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import toast from "react-hot-toast"

export default function AdminInfortunistica() {
  const { data: session } = useSession()
  const router = useRouter()
  const params = useParams()
  
  const [accidents, setAccidents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Filters
  const [statusFilter, setStatusFilter] = useState("")
  const [severityFilter, setSeverityFilter] = useState("")

  const fetchAccidents = async () => {
    setLoading(true)
    try {
      const url = new URL("/api/admin/accidents", window.location.origin)
      if (statusFilter) url.searchParams.append("status", statusFilter)
      if (severityFilter) url.searchParams.append("severity", severityFilter)
      
      const res = await fetch(url.toString())
      if (res.ok) {
        const data = await res.json()
        setAccidents(data)
      } else {
        toast.error("Errore nel caricamento")
      }
    } catch (e) {
      toast.error("Errore di rete")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAccidents()
  }, [statusFilter, severityFilter])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "BOZZA": return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded font-bold text-xs">BOZZA</span>
      case "IN_COMPILAZIONE": return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-bold text-xs">IN COMPILAZIONE</span>
      case "REVISIONATO": return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded font-bold text-xs">REVISIONATO</span>
      case "CHIUSO": return <span className="px-2 py-1 bg-green-100 text-green-700 rounded font-bold text-xs">CHIUSO</span>
      default: return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded font-bold text-xs">{status}</span>
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <button onClick={() => router.push(`/${params.tenantSlug}/admin`)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors" title="Home Admin">
            <Home className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <ShieldAlert className="w-7 h-7 text-red-600" /> Ufficio Infortunistica
            </h1>
            <p className="text-gray-500">Gestione e revisione dei fascicoli di sinistro stradale.</p>
          </div>
        </div>
        <button
          onClick={async () => {
            const searchParams = new URLSearchParams()
            if (statusFilter) searchParams.append("status", statusFilter)
            if (severityFilter) searchParams.append("severity", severityFilter)
            searchParams.append("format", "csv")
            const url = `/api/admin/accidents/export/istat?${searchParams.toString()}`
            window.open(url, "_blank")
          }}
          className="px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-md"
        >
          <FileText size={16} /> Export ISTAT CSV
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex gap-4">
        <div className="flex-1">
          <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Stato Fascicolo</label>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-red-500"
          >
            <option value="">Tutti gli Stati</option>
            <option value="BOZZA">Bozza</option>
            <option value="IN_COMPILAZIONE">In Compilazione</option>
            <option value="REVISIONATO">Revisionato</option>
            <option value="CHIUSO">Chiuso</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Gravità</label>
          <select 
            value={severityFilter} 
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-red-500"
          >
            <option value="">Tutte le Gravità</option>
            <option value="SOLO_DANNI">Solo danni a cose</option>
            <option value="FERITI">Con Feriti</option>
            <option value="RISERVA_PROGNOSI">Prognosi Riservata</option>
            <option value="MORTALE">Mortale</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Caricamento in corso...</div>
        ) : accidents.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-800">Nessun fascicolo trovato</h3>
            <p className="text-gray-500">Non ci sono sinistri che corrispondono ai filtri selezionati.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-200 text-sm text-slate-600">
                <th className="p-4 font-bold">Protocollo</th>
                <th className="p-4 font-bold">Data</th>
                <th className="p-4 font-bold">Luogo</th>
                <th className="p-4 font-bold">Gravità</th>
                <th className="p-4 font-bold">Stato</th>
                <th className="p-4 font-bold">Agente Rilevatore</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {accidents.map((a) => (
                <tr key={a.id} className="border-b border-gray-100 hover:bg-red-50/30 transition-colors">
                  <td className="p-4 font-bold text-slate-800">{a.protocolNumber || "N/A"}</td>
                  <td className="p-4 text-sm">{format(new Date(a.date), "dd/MM/yyyy HH:mm")}</td>
                  <td className="p-4 text-sm truncate max-w-[200px]" title={a.address}>{a.address}</td>
                  <td className="p-4 text-sm">{a.severity.replace("_", " ")}</td>
                  <td className="p-4">{getStatusBadge(a.status)}</td>
                  <td className="p-4 text-sm">{a.reportingOfficer?.name || "N/D"}</td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => router.push(`/${params.tenantSlug}/admin/infortunistica/${a.id}`)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-full"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
