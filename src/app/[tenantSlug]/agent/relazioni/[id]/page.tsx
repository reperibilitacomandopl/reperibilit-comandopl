"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { FileText, Calendar, MapPin, ArrowLeft, Send, Clock, User } from "lucide-react"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import toast from "react-hot-toast"

export default function AgentServiceReportDetail() {
  const router = useRouter()
  const params = useParams()
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"info" | "interventions" | "accidents">("info")

  useEffect(() => {
    fetchReport()
  }, [params.id])

  const fetchReport = async () => {
    try {
      const res = await fetch(`/api/agent/service-reports/${params.id}`)
      if (res.ok) {
        const data = await res.json()
        setReport(data)
      }
    } catch (error) {
      console.error("Error fetching report", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (action: string) => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/agent/service-reports/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        toast.success(action === "SUBMIT" ? "Relazione inviata in revisione" : "Azione eseguita")
        fetchReport()
      } else {
        const err = await res.json()
        toast.error(err.error || "Errore")
      }
    } catch {
      toast.error("Errore di connessione")
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "BOZZA": return { label: "Bozza", color: "bg-gray-100 text-gray-700" }
      case "COMPILATO": return { label: "Compilato", color: "bg-blue-100 text-blue-700" }
      case "REVISIONATO": return { label: "Revisionato", color: "bg-yellow-100 text-yellow-700" }
      case "APPROVATO": return { label: "Approvato", color: "bg-green-100 text-green-700" }
      default: return { label: status, color: "bg-gray-100 text-gray-700" }
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-teal-500 mx-auto"></div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="p-8 text-center text-gray-500">
        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p>Relazione non trovata</p>
      </div>
    )
  }

  const statusInfo = getStatusLabel(report.status)

  return (
    <div className="p-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => router.back()} className="p-2 rounded-xl bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-600" />
            <h1 className="text-lg font-bold text-slate-800">Relazione di Servizio</h1>
          </div>
        </div>
      </div>

      {/* Status + Date */}
      <div className="flex items-center justify-between mt-2 mb-4 ml-12">
        <span className={`text-xs px-2 py-1 rounded-full font-bold ${statusInfo.color}`}>{statusInfo.label}</span>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Calendar size={12} />
          {format(new Date(report.reportDate), "dd MMMM yyyy, HH:mm", { locale: it })}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 mb-4">
        {(["info", "interventions", "accidents"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
              activeTab === tab
                ? "text-teal-600 border-b-2 border-teal-600"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {tab === "info" ? "Info" : tab === "interventions" ? "Interventi" : "Sinistri"}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "info" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <User size={14} className="text-gray-400" />
              <span className="font-medium">{report.author?.name || "Agente"}</span>
            </div>
            {report.shift && (
              <div className="flex items-center gap-2 text-sm">
                <Clock size={14} className="text-gray-400" />
                <span>Turno: {format(new Date(report.shift.date), "dd/MM/yyyy")} - {report.shift.type}</span>
              </div>
            )}
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Attivita Svolte</h3>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{report.activities}</p>
            </div>
            {report.outcome && (
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Esito</h3>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{report.outcome}</p>
              </div>
            )}
            {report.notes && (
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Note</h3>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{report.notes}</p>
              </div>
            )}
          </div>

          {report.status === "BOZZA" && (
            <button
              onClick={() => handleAction("SUBMIT")}
              disabled={actionLoading}
              className="w-full py-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
            >
              <Send size={16} />
              Invia in Revisione
            </button>
          )}
        </div>
      )}

      {activeTab === "interventions" && (
        <div className="space-y-3">
          {report.interventions?.length === 0 ? (
            <p className="text-sm text-gray-400 text-center p-4">Nessun intervento collegato</p>
          ) : (
            report.interventions?.map((interv: any) => (
              <div key={interv.id} className="bg-white rounded-xl border border-gray-100 p-3">
                <span className="text-xs font-bold text-teal-600">{interv.type}</span>
                <p className="text-sm text-gray-700">{interv.address}</p>
                <div className="flex gap-2 mt-1">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{interv.status}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{interv.priority}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "accidents" && (
        <div className="space-y-3">
          {report.accidentReports?.length === 0 ? (
            <p className="text-sm text-gray-400 text-center p-4">Nessun sinistro collegato</p>
          ) : (
            report.accidentReports?.map((acc: any) => (
              <div
                key={acc.id}
                onClick={() => router.push(`/${params.tenantSlug}/agent/sinistri/${acc.id}`)}
                className="bg-white rounded-xl border border-gray-100 p-3 cursor-pointer hover:border-red-200 transition-all"
              >
                <span className="text-xs font-bold text-red-600">{acc.protocolNumber}</span>
                <p className="text-sm text-gray-700">{acc.address}</p>
                <div className="flex gap-2 mt-1">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{acc.severity}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{acc.status}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
