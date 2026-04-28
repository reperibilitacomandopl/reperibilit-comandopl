"use client"

import { useState, useEffect } from "react"
import { Plus, Search, Filter, BookOpen, Clock, AlertTriangle, CheckCircle2, ChevronRight, Edit3, Trash2 } from "lucide-react"
import TrainingRecordEditor from "./TrainingRecordEditor"

interface TrainingManagementPanelProps {
  agents: any[]
}

export default function TrainingManagementPanel({ agents }: TrainingManagementPanelProps) {
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("ALL")
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<any>(null)

  useEffect(() => {
    fetchRecords()
  }, [])

  const fetchRecords = async () => {
    try {
      const res = await fetch("/api/admin/training")
      const data = await res.json()
      if (data.success) setRecords(data.trainingRecords)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questa registrazione?")) return
    try {
      const res = await fetch(`/api/admin/training/${id}`, { method: "DELETE" })
      if (res.ok) setRecords(records.filter(r => r.id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  const filteredRecords = records.filter(r => {
    const matchesSearch = 
      r.courseName.toLowerCase().includes(search.toLowerCase()) ||
      r.user?.name.toLowerCase().includes(search.toLowerCase()) ||
      r.certificationId?.toLowerCase().includes(search.toLowerCase())
    
    const matchesStatus = filterStatus === "ALL" || r.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string, expiryDate: string | null) => {
    const now = new Date()
    const expiry = expiryDate ? new Date(expiryDate) : null
    
    if (expiry && expiry < now) {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-600 text-xs font-black border border-rose-100">
          <AlertTriangle size={12} />
          SCADUTO
        </span>
      )
    }
    
    if (expiry) {
      const daysToExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      if (daysToExpiry <= 30) {
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-600 text-xs font-black border border-orange-100">
            <Clock size={12} />
            IN SCADENZA
          </span>
        )
      }
    }

    if (status === "VALID") {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-black border border-emerald-100">
          <CheckCircle2 size={12} />
          VALIDO
        </span>
      )
    }

    return (
      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 text-slate-600 text-xs font-black border border-slate-100">
        {status}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Cerca corso, agente o protocollo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-slate-900 font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
          />
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-slate-200 p-1 rounded-2xl">
            <button
              onClick={() => setFilterStatus("ALL")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filterStatus === "ALL" ? "bg-slate-900 text-white shadow-lg shadow-slate-200" : "text-slate-500 hover:text-slate-900"}`}
            >
              TUTTI
            </button>
            <button
              onClick={() => setFilterStatus("VALID")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filterStatus === "VALID" ? "bg-emerald-600 text-white shadow-lg shadow-emerald-100" : "text-slate-500 hover:text-emerald-600"}`}
            >
              VALIDI
            </button>
            <button
              onClick={() => setFilterStatus("EXPIRED")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filterStatus === "EXPIRED" ? "bg-rose-600 text-white shadow-lg shadow-rose-100" : "text-slate-500 hover:text-rose-600"}`}
            >
              SCADUTI
            </button>
          </div>
          
          <button
            onClick={() => { setSelectedRecord(null); setIsEditorOpen(true); }}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all"
          >
            <Plus size={18} />
            NUOVO
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-wider">Agente</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-wider">Corso / Certificazione</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-wider">Dati</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-wider text-center">Stato</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-wider text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
                      <p className="text-slate-400 font-bold">Caricamento dati in corso...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-200">
                        <BookOpen size={32} />
                      </div>
                      <div>
                        <p className="text-slate-900 font-black text-lg">Nessun record trovato</p>
                        <p className="text-slate-500 font-medium">Inizia aggiungendo una nuova certificazione</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black text-sm">
                          {r.user?.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-slate-900 font-black leading-none">{r.user?.name}</p>
                          <p className="text-slate-400 text-xs font-bold mt-1">Matr. {r.user?.matricola}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div>
                        <p className="text-slate-900 font-black leading-none">{r.courseName}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-black uppercase">
                            {r.category}
                          </span>
                          {r.certificationId && (
                            <span className="text-slate-400 text-[10px] font-bold">
                              ID: {r.certificationId}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                          <Clock size={12} className="text-slate-300" />
                          Rilascio: {new Date(r.issueDate).toLocaleDateString()}
                        </p>
                        {r.expiryDate && (
                          <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                            <AlertTriangle size={12} className="text-slate-300" />
                            Scadenza: {new Date(r.expiryDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex justify-center">
                        {getStatusBadge(r.status, r.expiryDate)}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setSelectedRecord(r); setIsEditorOpen(true); }}
                          className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 rounded-xl transition-all shadow-sm"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 rounded-xl transition-all shadow-sm"
                        >
                          <Trash2 size={16} />
                        </button>
                        <ChevronRight size={18} className="text-slate-300 ml-2" />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isEditorOpen && (
        <TrainingRecordEditor
          record={selectedRecord}
          agents={agents}
          onClose={() => setIsEditorOpen(false)}
          onSave={() => {
            fetchRecords()
            setIsEditorOpen(false)
          }}
        />
      )}
    </div>
  )
}
