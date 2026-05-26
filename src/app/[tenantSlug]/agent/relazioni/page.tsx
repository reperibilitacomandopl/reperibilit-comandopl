"use client"

import { useState, useEffect } from "react"
import { FileText, Plus, MapPin, Calendar, ChevronRight } from "lucide-react"
import { useRouter, useParams } from "next/navigation"
import { format } from "date-fns"
import { it } from "date-fns/locale"

export default function AgentServiceReportsList() {
  const router = useRouter()
  const params = useParams()
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await fetch("/api/agent/service-reports")
        if (res.ok) {
          const data = await res.json()
          setReports(data)
        }
      } catch (error) {
        console.error("Error fetching service reports", error)
      } finally {
        setLoading(false)
      }
    }
    fetchReports()
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "BOZZA": return "bg-gray-100 text-gray-700 border-gray-200"
      case "COMPILATO": return "bg-blue-100 text-blue-700 border-blue-200"
      case "REVISIONATO": return "bg-yellow-100 text-yellow-700 border-yellow-200"
      case "APPROVATO": return "bg-green-100 text-green-700 border-green-200"
      default: return "bg-gray-100 text-gray-700 border-gray-200"
    }
  }

  return (
    <div className="p-4 pb-24 space-y-4">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <FileText className="w-6 h-6 text-teal-600" />
          <h1 className="text-xl font-bold text-slate-800">Relazioni di Servizio</h1>
        </div>
        <button
          onClick={() => router.push(`/${params.tenantSlug}/agent/relazioni/nuovo`)}
          className="bg-teal-600 text-white p-2 rounded-full shadow-md shadow-teal-200"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {loading ? (
        <div className="text-center p-8 text-gray-500">Caricamento in corso...</div>
      ) : reports.length === 0 ? (
        <div className="text-center p-8 bg-gray-50 rounded-xl border border-gray-100">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nessuna relazione compilata</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div
              key={r.id}
              onClick={() => router.push(`/${params.tenantSlug}/agent/relazioni/${r.id}`)}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col gap-3 active:scale-[0.98] transition-transform cursor-pointer"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-slate-800 truncate max-w-[200px]">
                    {r.activities?.substring(0, 50) || "Relazione"}
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">
                    {format(new Date(r.reportDate), "dd MMMM yyyy", { locale: it })}
                  </p>
                </div>
                <span className={`text-[10px] px-2 py-1 rounded-full font-bold border ${getStatusColor(r.status)}`}>
                  {r.status}
                </span>
              </div>

              <div className="flex flex-col gap-1.5 text-sm text-gray-600">
                <p className="line-clamp-2 text-xs">{r.activities}</p>
                {r.outcome && <p className="text-xs text-gray-400 italic">Esito: {r.outcome}</p>}
              </div>

              <div className="pt-3 mt-1 border-t border-gray-50 flex justify-between items-center">
                <div className="text-xs text-gray-500 flex items-center gap-2">
                  <span>Interventi: <b className="text-slate-700">{r.interventionIds?.length || 0}</b></span>
                  <span>Sinistri: <b className="text-slate-700">{r.accidentReportIds?.length || 0}</b></span>
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
