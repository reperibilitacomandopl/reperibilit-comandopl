"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { FileText, ArrowLeft, User, Clock, CheckCircle, RotateCcw, Printer } from "lucide-react"
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

  useEffect(() => { fetchReport() }, [params.id])

  const fetchReport = async () => {
    try {
      const res = await fetch("/api/agent/service-reports/" + params.id)
      if (res.ok) setReport(await res.json())
    } catch (error) { console.error("Error fetching report", error) }
    finally { setLoading(false) }
  }

  const handleAction = async (action: string) => {
    setActionLoading(true)
    try {
      const body: any = { action }
      if (action === "REOPEN" && reopenReason) body.reason = reopenReason
      const res = await fetch("/api/agent/service-reports/" + params.id, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.ok) { toast.success("Azione eseguita"); setShowReopen(false); setReopenReason(""); fetchReport() }
      else toast.error((await res.json()).error || "Errore")
    } catch { toast.error("Errore di connessione") }
    finally { setActionLoading(false) }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "BOZZA": return <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full font-bold text-xs">Bozza</span>
      case "COMPILATO": return <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-bold text-xs">Compilato</span>
      case "REVISIONATO": return <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full font-bold text-xs">Revisionato</span>
      case "APPROVATO": return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full font-bold text-xs">Approvato</span>
      default: return <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full font-bold text-xs">{status}</span>
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-500"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-teal-500 mx-auto"></div></div>
  if (!report) return <div className="p-8 text-center text-gray-500"><FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" /><p>Relazione non trovata</p></div>

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-7 h-7 text-teal-600" /> Relazione di Servizio
          </h1>
          <p className="text-gray-500">{format(new Date(report.reportDate), "dd MMMM yyyy, HH:mm", { locale: it })}</p>
        </div>
        {getStatusBadge(report.status)}
      </div>

      <div className="flex border-b border-gray-200">
        {(["info", "interventions", "accidents"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
              activeTab === tab ? "text-teal-600 border-b-2 border-teal-600" : "text-gray-400 hover:text-gray-600"}`}>
            {tab === "info" ? "Info" : tab === "interventions" ? "Interventi" : "Sinistri"}
          </button>
        ))}
      </div>

      {activeTab === "info" && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <User size={14} className="text-gray-400" />
              <span className="font-bold">{report.author?.name || "Agente"} ({report.author?.matricola || "n/d"})</span>
            </div>
            {report.shift && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock size={14} />
                <span>Turno: {format(new Date(report.shift.date), "dd/MM/yyyy")} - {report.shift.type}</span>
              </div>
            )}
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Attivita Svolte</h3>
              <p className="text-sm text-slate-700 whitespace-pre-wrap bg-gray-50 rounded-xl p-4 border border-gray-100">
                {report.activities}
              </p>
            </div>
            {report.outcome && (
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Esito</h3>
                <p className="text-sm text-slate-700 whitespace-pre-wrap bg-gray-50 rounded-xl p-4 border border-gray-100">
                  {report.outcome}
                </p>
              </div>
            )}
            {report.notes && (
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Note</h3>
                <p className="text-sm text-slate-700 whitespace-pre-wrap bg-gray-50 rounded-xl p-4 border border-gray-100">
                  {report.notes}
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            {report.status === "COMPILATO" && (
              <button onClick={() => handleAction("MARK_REVIEWED")} disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all">
                <CheckCircle size={16} /> Revisiona
              </button>
            )}
            {report.status === "REVISIONATO" && (
              <button onClick={() => handleAction("APPROVE")} disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all">
                <CheckCircle size={16} /> Approva
              </button>
            )}
            {report.status === "APPROVATO" && (
              <button onClick={() => setShowReopen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-bold transition-all">
                <RotateCcw size={16} /> Riapri
              </button>
            )}
            <button onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-slate-700 rounded-xl text-sm font-bold transition-all">
              <Printer size={16} /> Stampa
            </button>
          </div>

          {showReopen && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
              <h4 className="text-sm font-bold text-amber-800">Motivazione riapertura</h4>
              <input type="text" value={reopenReason} onChange={e => setReopenReason(e.target.value)}
                placeholder="Motivo della riapertura..."
                className="w-full bg-white border border-amber-200 rounded-xl p-3 text-sm text-slate-700" />
              <div className="flex gap-2">
                <button onClick={() => handleAction("REOPEN")} disabled={actionLoading || !reopenReason.trim()}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold">
                  Conferma Riapertura
                </button>
                <button onClick={() => setShowReopen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-slate-700 rounded-xl text-sm">Annulla</button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "interventions" && (
        <div className="space-y-3">
          {(!report.interventions || report.interventions.length === 0) && (
            <p className="text-gray-400 text-center p-8">Nessun intervento collegato</p>
          )}
          {report.interventions && report.interventions.map((interv: any) => (
            <div key={interv.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <span className="text-xs font-bold text-teal-600">{interv.type}</span>
              <p className="text-sm text-slate-700 mt-1">{interv.address}</p>
              <div className="flex gap-2 mt-2">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{interv.status}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{interv.priority}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "accidents" && (
        <div className="space-y-3">
          {(!report.accidentReports || report.accidentReports.length === 0) && (
            <p className="text-gray-400 text-center p-8">Nessun sinistro collegato</p>
          )}
          {report.accidentReports && report.accidentReports.map((acc: any) => (
            <div key={acc.id} onClick={() => router.push("/" + params.tenantSlug + "/admin/infortunistica/" + acc.id)}
              className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm cursor-pointer hover:border-red-300 transition-all">
              <span className="text-xs font-bold text-red-600">{acc.protocolNumber}</span>
              <p className="text-sm text-slate-700 mt-1">{acc.address}</p>
              <div className="flex gap-2 mt-2">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{acc.severity}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{acc.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
