"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { FileText, Calendar, ArrowLeft, User, Clock, CheckCircle, RotateCcw, Printer } from "lucide-react"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import toast from "react-hot-toast"

export default function AdminServiceReportDetail() {
  const router = useRouter()
  const params = useParams()
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"info" | "interventions" | "accidents">("info")
  const [reopenReason, setReopenReason] = useState("")
  const [showReopen, setShowReopen] = useState(false)

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
      const body: any = { action }
      if (action === "REOPEN" && reopenReason) body.reason = reopenReason
      const res = await fetch(`/api/agent/service-reports/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        toast.success("Azione eseguita con successo")
        setShowReopen(false)
        setReopenReason("")
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
      case "BOZZA": return { label: "Bozza", color: "bg-gray-500/20 text-gray-400" }
      case "COMPILATO": return { label: "Compilato", color: "bg-blue-500/20 text-blue-400" }
      case "REVISIONATO": return { label: "Revisionato", color: "bg-yellow-500/20 text-yellow-400" }
      case "APPROVATO": return { label: "Approvato", color: "bg-green-500/20 text-green-400" }
      default: return { label: status, color: "bg-gray-500/20 text-gray-400" }
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-teal-500 mx-auto"></div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="p-8 text-center text-slate-400">
        <FileText className="w-12 h-12 mx-auto mb-3 text-slate-600" />
        <p>Relazione non trovata</p>
      </div>
    )
  }

  const statusInfo = getStatusLabel(report.status)

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-300" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center">
              <FileText className="text-teal-400" size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Relazione di Servizio</h1>
              <p className="text-slate-500 text-xs uppercase tracking-widest">
                {format(new Date(report.reportDate), "dd MMMM yyyy, HH:mm", { locale: it })}
              </p>
            </div>
          </div>
        </div>
        <span className={`text-xs px-3 py-1 rounded-full font-bold ${statusInfo.color}`}>{statusInfo.label}</span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5">
        {(["info", "interventions", "accidents"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
              activeTab === tab
                ? "text-teal-400 border-b-2 border-teal-400"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {tab === "info" ? "Info" : tab === "interventions" ? "Interventi" : "Sinistri"}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "info" && (
        <div className="space-y-6">
          <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <User size={14} className="text-slate-400" />
              <span className="font-bold">{report.author?.name || "Agente"} ({report.author?.matricola || "n/d"})</span>
            </div>
            {report.shift && (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Clock size={14} />
                <span>Turno: {format(new Date(report.shift.date), "dd/MM/yyyy")} - {report.shift.type}</span>
              </div>
            )}
            <div>
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Attivita Svolte</h3>
              <p className="text-sm text-slate-300 whitespace-pre-wrap bg-slate-950 rounded-xl p-4 border border-white/5">
                {report.activities}
              </p>
            </div>
            {report.outcome && (
              <div>
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Esito</h3>
                <p className="text-sm text-slate-300 whitespace-pre-wrap bg-slate-950 rounded-xl p-4 border border-white/5">
                  {report.outcome}
                </p>
              </div>
            )}
            {report.notes && (
              <div>
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Note</h3>
                <p className="text-sm text-slate-300 whitespace-pre-wrap bg-slate-950 rounded-xl p-4 border border-white/5">
                  {report.notes}
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {report.status === "COMPILATO" && (
              <button
                onClick={() => handleAction("MARK_REVIEWED")}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all"
              >
                <CheckCircle size={16} />
                Revisiona
              </button>
            )}
            {report.status === "REVISIONATO" && (
              <button
                onClick={() => handleAction("APPROVE")}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all"
              >
                <CheckCircle size={16} />
                Approva
              </button>
            )}
            {report.status === "APPROVATO" && (
              <button
                onClick={() => setShowReopen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-bold transition-all"
              >
                <RotateCcw size={16} />
                Riapri
              </button>
            )}
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-bold transition-all"
            >
              <Printer size={16} />
              Stampa
            </button>
          </div>

          {showReopen && (
            <div className="bg-slate-900/50 border border-amber-500/20 rounded-2xl p-4 space-y-3">
              <h4 className="text-sm font-bold text-amber-400">Motivazione riapertura</h4>
              <input
                type="text"
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                placeholder="Motivo della riapertura..."
                className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-sm text-white"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleAction("REOPEN")}
                  disabled={actionLoading || !reopenReason.trim()}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold"
                >
                  Conferma Riapertura
                </button>
                <button
                  onClick={() => setShowReopen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm"
                >
                  Annulla
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "interventions" && (
        <div className="space-y-3">
          {report.interventions?.length === 0 ? (
            <p className="text-slate-500 text-center p-8">Nessun intervento collegato</p>
          ) : (
            report.interventions?.map((interv: any) => (
              <div key={interv.id} className="bg-slate-900/50 border border-white/5 rounded-xl p-4">
                <span className="text-xs font-bold text-teal-400">{interv.type}</span>
                <p className="text-sm text-slate-300 mt-1">{interv.address}</p>
                <div className="flex gap-2 mt-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">{interv.status}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">{interv.priority}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "accidents" && (
        <div className="space-y-3">
          {report.accidentReports?.length === 0 ? (
            <p className="text-slate-500 text-center p-8">Nessun sinistro collegato</p>
          ) : (
            report.accidentReports?.map((acc: any) => (
              <div
                key={acc.id}
                onClick={() => router.push(`/${params.tenantSlug}/admin/infortunistica/${acc.id}`)}
                className="bg-slate-900/50 border border-white/5 rounded-xl p-4 cursor-pointer hover:border-red-500/20 transition-all"
              >
                <span className="text-xs font-bold text-red-400">{acc.protocolNumber}</span>
                <p className="text-sm text-slate-300 mt-1">{acc.address}</p>
                <div className="flex gap-2 mt-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">{acc.severity}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">{acc.status}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
