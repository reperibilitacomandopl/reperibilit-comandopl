"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { FileText, Calendar, User, ChevronRight, Filter, Download } from "lucide-react"
import { format } from "date-fns"
import { it } from "date-fns/locale"

export default function AdminServiceReportsList() {
  const router = useRouter()
  const params = useParams()
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState("")
  const [filterAuthor, setFilterAuthor] = useState("")
  const [agents, setAgents] = useState<any[]>([])

  useEffect(() => {
    fetchReports()
    fetchAgents()
  }, [filterStatus, filterAuthor])

  const fetchReports = async () => {
    setLoading(true)
    try {
      const query = new URLSearchParams()
      if (filterStatus) query.set("status", filterStatus)
      if (filterAuthor) query.set("authorId", filterAuthor)
      const res = await fetch(`/api/admin/service-reports?${query.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setReports(data)
      }
    } catch (error) {
      console.error("Error fetching reports", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAgents = async () => {
    try {
      const res = await fetch(`/api/admin/users`)
      if (res.ok) {
        const data = await res.json()
        setAgents(data.filter((u: any) => u.role === "AGENT"))
      }
    } catch {}
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "BOZZA": return "bg-gray-100 text-gray-700"
      case "COMPILATO": return "bg-blue-100 text-blue-700"
      case "REVISIONATO": return "bg-yellow-100 text-yellow-700"
      case "APPROVATO": return "bg-green-100 text-green-700"
      default: return "bg-gray-100 text-gray-700"
    }
  }

  const exportCSV = () => {
    const headers = "Data,Agente,Attivita,Esito,Note,Stato,Interventi,Sinistri\n"
    const rows = reports.map((r) =>
      [
        format(new Date(r.reportDate), "dd/MM/yyyy HH:mm"),
        r.author?.name || "",
        `"${(r.activities || "").replace(/"/g, '""')}"`,
        `"${(r.outcome || "").replace(/"/g, '""')}"`,
        `"${(r.notes || "").replace(/"/g, '""')}"`,
        r.status,
        r.interventionIds?.length || 0,
        r.accidentReportIds?.length || 0,
      ].join(",")
    ).join("\n")
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = `relazioni-servizio-${format(new Date(), "yyyy-MM-dd")}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center">
            <FileText className="text-teal-500" size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Relazioni di Servizio</h1>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Rapporti giornalieri agenti</p>
          </div>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-white/10 rounded-xl text-sm text-slate-300 hover:bg-slate-700 transition-all"
        >
          <Download size={14} />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
        >
          <option value="">Tutti gli stati</option>
          <option value="BOZZA">Bozza</option>
          <option value="COMPILATO">Compilato</option>
          <option value="REVISIONATO">Revisionato</option>
          <option value="APPROVATO">Approvato</option>
        </select>
        <select
          value={filterAuthor}
          onChange={(e) => setFilterAuthor(e.target.value)}
          className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
        >
          <option value="">Tutti gli agenti</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center p-12 text-slate-400">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-teal-500 mx-auto"></div>
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center p-12 bg-slate-900/50 border border-white/5 rounded-3xl">
          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">Nessuna relazione trovata</p>
        </div>
      ) : (
        <div className="bg-slate-900/50 border border-white/5 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left p-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Data</th>
                  <th className="text-left p-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Agente</th>
                  <th className="text-left p-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Attivita</th>
                  <th className="text-left p-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Stato</th>
                  <th className="text-left p-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Rif.</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => router.push(`/${params.tenantSlug}/admin/relazioni/${r.id}`)}
                    className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <td className="p-3 text-sm text-white whitespace-nowrap">
                      {format(new Date(r.reportDate), "dd/MM/yy HH:mm")}
                    </td>
                    <td className="p-3 text-sm text-slate-300">{r.author?.name || "-"}</td>
                    <td className="p-3 text-sm text-slate-300 max-w-[200px] truncate">{r.activities}</td>
                    <td className="p-3">
                      <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${getStatusColor(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-slate-400">
                      I:{r.interventionIds?.length || 0} S:{r.accidentReportIds?.length || 0}
                    </td>
                    <td className="p-3"><ChevronRight className="w-4 h-4 text-slate-500" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
