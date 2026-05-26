"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { FileText, ChevronRight, Download } from "lucide-react"
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

  useEffect(() => { fetchReports(); fetchAgents() }, [filterStatus, filterAuthor])

  const fetchReports = async () => {
    setLoading(true)
    try {
      const query = new URLSearchParams()
      if (filterStatus) query.set("status", filterStatus)
      if (filterAuthor) query.set("authorId", filterAuthor)
      const res = await fetch(`/api/admin/service-reports?${query.toString()}`)
      if (res.ok) setReports(await res.json())
    } catch (error) { console.error("Error fetching reports", error) }
    finally { setLoading(false) }
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "BOZZA": return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded font-bold text-xs">BOZZA</span>
      case "COMPILATO": return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-bold text-xs">COMPILATO</span>
      case "REVISIONATO": return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded font-bold text-xs">REVISIONATO</span>
      case "APPROVATO": return <span className="px-2 py-1 bg-green-100 text-green-700 rounded font-bold text-xs">APPROVATO</span>
      default: return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded font-bold text-xs">{status}</span>
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
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-7 h-7 text-teal-600" /> Relazioni di Servizio
          </h1>
          <p className="text-gray-500">Rapporti giornalieri compilati dagli agenti.</p>
        </div>
        <button onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-bold hover:bg-teal-500 transition-all shadow-sm">
          <Download size={14} /> Export CSV
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Stato</label>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-slate-700">
            <option value="">Tutti gli stati</option>
            <option value="BOZZA">Bozza</option>
            <option value="COMPILATO">Compilato</option>
            <option value="REVISIONATO">Revisionato</option>
            <option value="APPROVATO">Approvato</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Agente</label>
          <select value={filterAuthor} onChange={e => setFilterAuthor(e.target.value)}
            className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-slate-700">
            <option value="">Tutti gli agenti</option>
            {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-500">Caricamento in corso...</div>
      ) : reports.length === 0 ? (
        <div className="p-12 text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-800">Nessuna relazione trovata</h3>
          <p className="text-gray-500">Non ci sono relazioni che corrispondono ai filtri selezionati.</p>
        </div>
      ) : (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-gray-200 text-sm text-slate-600">
              <th className="p-4 font-bold">Data</th>
              <th className="p-4 font-bold">Agente</th>
              <th className="p-4 font-bold">Attivita</th>
              <th className="p-4 font-bold">Stato</th>
              <th className="p-4 font-bold">Rif.</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {reports.map(r => (
              <tr key={r.id}
                onClick={() => router.push(`/${params.tenantSlug}/admin/relazioni/${r.id}`)}
                className="border-b border-gray-100 hover:bg-slate-50 cursor-pointer transition-colors">
                <td className="p-4 text-sm text-slate-700 whitespace-nowrap">{format(new Date(r.reportDate), "dd/MM/yy HH:mm")}</td>
                <td className="p-4 text-sm text-slate-700">{r.author?.name || "-"}</td>
                <td className="p-4 text-sm text-slate-600 max-w-[200px] truncate">{r.activities}</td>
                <td className="p-4">{getStatusBadge(r.status)}</td>
                <td className="p-4 text-sm text-slate-500">I:{r.interventionIds?.length || 0} S:{r.accidentReportIds?.length || 0}</td>
                <td className="p-4 text-right">
                  <button className="p-2 text-teal-600 hover:bg-teal-100 rounded-full">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
