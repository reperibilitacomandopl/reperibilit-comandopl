"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Search, Filter, FileText, Clock, MapPin, User, Download, ChevronDown, ChevronUp, Phone, Shield } from "lucide-react"

const STATUS_LABELS: Record<string, string> = {
  PENDING: "In Attesa", DISPATCHED: "Inviato", ACCEPTED: "Accettato",
  ON_SITE: "Sul Posto", COMPLETED: "Completato", CANCELED: "Annullato"
}
const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-700", DISPATCHED: "bg-blue-100 text-blue-700",
  ACCEPTED: "bg-purple-100 text-purple-700", ON_SITE: "bg-yellow-100 text-yellow-700",
  COMPLETED: "bg-green-100 text-green-700", CANCELED: "bg-red-100 text-red-700"
}

export default function RegistroInterventi() {
  const { data: session } = useSession()
  const [interventions, setInterventions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  
  // Filtri
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [status, setStatus] = useState("ALL")
  const [priority, setPriority] = useState("ALL")
  const [search, setSearch] = useState("")

  const fetchData = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (from) params.set("from", from)
    if (to) params.set("to", to)
    if (status !== "ALL") params.set("status", status)
    if (priority !== "ALL") params.set("priority", priority)
    if (search) params.set("search", search)
    
    try {
      const res = await fetch(`/api/admin/interventions/registry?${params}`)
      if (res.ok) setInterventions(await res.json())
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleExport = () => {
    const csv = [
      "Data,Ora,Tipo,Priorità,Indirizzo,Stato,Operatore,Richiedente,Telefono,Descrizione,Note Centrale,Esito,Note Operatore,Ora Invio,Ora Accettazione,Ora Arrivo,Ora Chiusura"
    ]
    for (const i of interventions) {
      const d = new Date(i.createdAt)
      csv.push([
        d.toLocaleDateString('it-IT'), d.toLocaleTimeString('it-IT'),
        i.type, i.priority, `"${i.address}"`, i.status,
        i.assignedTo?.name || "", i.callerName || "", i.callerPhone || "",
        `"${(i.description || '').replace(/"/g, '""')}"`,
        `"${(i.notes || '').replace(/"/g, '""')}"`,
        i.outcome || "",
        `"${(i.outcomeNotes || '').replace(/"/g, '""')}"`,
        i.dispatchedAt ? new Date(i.dispatchedAt).toLocaleTimeString('it-IT') : "",
        i.acceptedAt ? new Date(i.acceptedAt).toLocaleTimeString('it-IT') : "",
        i.arrivedAt ? new Date(i.arrivedAt).toLocaleTimeString('it-IT') : "",
        i.completedAt ? new Date(i.completedAt).toLocaleTimeString('it-IT') : ""
      ].join(","))
    }
    const blob = new Blob([csv.join("\n")], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = `registro_interventi_${new Date().toISOString().slice(0,10)}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  if (!session) return null

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Registro Interventi</h1>
            <p className="text-xs text-slate-500">Storico completo per accesso agli atti</p>
          </div>
        </div>
        <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 shadow-sm">
          <Download className="w-4 h-4"/> Esporta CSV
        </button>
      </div>

      {/* Barra Filtri */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Dal</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-full border rounded-lg p-2 text-sm"/>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Al</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-full border rounded-lg p-2 text-sm"/>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Stato</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className="w-full border rounded-lg p-2 text-sm">
              <option value="ALL">Tutti</option>
              <option value="PENDING">In Attesa</option>
              <option value="DISPATCHED">Inviato</option>
              <option value="ACCEPTED">Accettato</option>
              <option value="ON_SITE">Sul Posto</option>
              <option value="COMPLETED">Completato</option>
              <option value="CANCELED">Annullato</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Priorità</label>
            <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full border rounded-lg p-2 text-sm">
              <option value="ALL">Tutte</option>
              <option value="RED">🔴 Rosso</option>
              <option value="YELLOW">🟡 Giallo</option>
              <option value="GREEN">🟢 Verde</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cerca</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400"/>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Via, tipo, nome..." className="w-full border rounded-lg p-2 pl-8 text-sm"/>
            </div>
          </div>
          <div className="flex items-end">
            <button onClick={fetchData} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-2">
              <Filter className="w-4 h-4"/> Filtra
            </button>
          </div>
        </div>
      </div>

      {/* Risultati */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b text-xs font-bold text-slate-500 flex items-center justify-between">
          <span>Risultati: {interventions.length} interventi</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400">Caricamento...</div>
        ) : interventions.length === 0 ? (
          <div className="p-8 text-center text-slate-400">Nessun intervento trovato con i filtri selezionati.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {interventions.map(i => {
              const isExpanded = expandedId === i.id
              const d = new Date(i.createdAt)
              return (
                <div key={i.id} className="hover:bg-slate-50 transition-colors">
                  <button onClick={() => setExpandedId(isExpanded ? null : i.id)} className="w-full px-4 py-3 flex items-center gap-4 text-left">
                    {/* Priority dot */}
                    <div className={`w-3 h-3 rounded-full shrink-0 ${i.priority === 'RED' ? 'bg-red-500' : i.priority === 'YELLOW' ? 'bg-yellow-500' : 'bg-green-500'}`}/>
                    
                    {/* Date */}
                    <div className="w-24 shrink-0">
                      <p className="text-xs font-bold text-slate-800">{d.toLocaleDateString('it-IT')}</p>
                      <p className="text-[10px] text-slate-400">{d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>

                    {/* Type */}
                    <div className="w-32 shrink-0">
                      <p className="text-xs font-semibold text-slate-700">{i.type}</p>
                    </div>

                    {/* Address */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-600 truncate">{i.address}</p>
                    </div>

                    {/* Operator */}
                    <div className="w-36 shrink-0 text-right">
                      <p className="text-xs text-slate-600">{i.assignedTo?.name || "—"}</p>
                    </div>

                    {/* Status */}
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${STATUS_COLORS[i.status] || 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABELS[i.status] || i.status}
                    </span>

                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0"/> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0"/>}
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0 bg-slate-50 border-t border-slate-100">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Richiedente</p>
                          <p className="text-slate-700">{i.callerName || "N/D"}</p>
                          {i.callerPhone && <p className="text-slate-500 flex items-center gap-1"><Phone className="w-3 h-3"/>{i.callerPhone}</p>}
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Operatore</p>
                          <p className="text-slate-700">{i.assignedTo?.name || "Non assegnato"}</p>
                          {i.assignedTo?.matricola && <p className="text-slate-500">Matr. {i.assignedTo.matricola}</p>}
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Cronologia</p>
                          <div className="space-y-0.5 text-slate-600">
                            <p>📨 Creato: {new Date(i.createdAt).toLocaleString('it-IT')}</p>
                            {i.dispatchedAt && <p>📤 Inviato: {new Date(i.dispatchedAt).toLocaleTimeString('it-IT')}</p>}
                            {i.acceptedAt && <p>✅ Accettato: {new Date(i.acceptedAt).toLocaleTimeString('it-IT')}</p>}
                            {i.arrivedAt && <p>📍 Arrivo: {new Date(i.arrivedAt).toLocaleTimeString('it-IT')}</p>}
                            {i.completedAt && <p>🏁 Chiuso: {new Date(i.completedAt).toLocaleTimeString('it-IT')}</p>}
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Descrizione ed Esito</p>
                          <p className="text-slate-600">{i.description || "Nessuna descrizione"}</p>
                          {i.notes && <p className="mt-1 text-slate-500 italic">Note Centrale: {i.notes}</p>}
                          {i.outcome && (
                            <div className="mt-2 p-2 bg-white rounded border border-slate-100">
                              <p className="text-xs font-bold text-slate-700">Esito: <span className={i.outcome === 'POSITIVO' ? 'text-green-600' : i.outcome === 'NEGATIVO' ? 'text-red-600' : 'text-slate-600'}>{i.outcome}</span></p>
                              {i.outcomeNotes && <p className="text-xs text-slate-500 italic mt-1">Note Operatore: {i.outcomeNotes}</p>}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
