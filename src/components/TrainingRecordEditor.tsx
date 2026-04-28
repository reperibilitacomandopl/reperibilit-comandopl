"use client"

import { useState } from "react"
import { X, Calendar, BookOpen, User, Tag, FileText, CheckCircle2 } from "lucide-react"

interface TrainingRecordEditorProps {
  record?: any
  agents: any[]
  onClose: () => void
  onSave: (record: any) => void
}

const CATEGORIES = ["SIA", "Guida Sicura", "Armi", "Primo Soccorso", "Codice della Strada", "Polizia Giudiziaria", "Altro"]

export default function TrainingRecordEditor({ record, agents, onClose, onSave }: TrainingRecordEditorProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    userId: record?.userId || "",
    courseName: record?.courseName || "",
    category: record?.category || "SIA",
    description: record?.description || "",
    issueDate: record?.issueDate ? new Date(record.issueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    expiryDate: record?.expiryDate ? new Date(record.expiryDate).toISOString().split('T')[0] : "",
    certificationId: record?.certificationId || "",
    notes: record?.notes || "",
    status: record?.status || "VALID"
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const method = record?.id ? "PUT" : "POST"
      const url = record?.id ? `/api/admin/training/${record.id}` : "/api/admin/training"
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })

      if (!response.ok) throw new Error("Errore durante il salvataggio")
      
      const data = await response.json()
      onSave(data.record || data)
      onClose()
    } catch (error) {
      console.error(error)
      alert("Si è verificato un errore")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <BookOpen className="text-blue-600" />
              {record ? "Modifica Certificazione" : "Nuova Certificazione"}
            </h2>
            <p className="text-slate-500 text-sm font-medium mt-1">Registra corsi di formazione e brevetti tecnici</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2 ml-1">
                <User size={16} className="text-blue-500" />
                Agente
              </label>
              <select
                required
                value={formData.userId}
                onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
              >
                <option value="">Seleziona Agente...</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>{a.name} ({a.matricola})</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2 ml-1">
                <Tag size={16} className="text-blue-500" />
                Categoria
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2 ml-1">
                <BookOpen size={16} className="text-blue-500" />
                Nome Corso / Titolo
              </label>
              <input
                type="text"
                required
                value={formData.courseName}
                onChange={(e) => setFormData({ ...formData, courseName: e.target.value })}
                placeholder="es: Corso Avanzato Guida Operativa"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2 ml-1">
                <Calendar size={16} className="text-emerald-500" />
                Data Rilascio
              </label>
              <input
                type="date"
                required
                value={formData.issueDate}
                onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2 ml-1">
                <Calendar size={16} className="text-rose-500" />
                Data Scadenza (Opzionale)
              </label>
              <input
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2 ml-1">
                <FileText size={16} className="text-blue-500" />
                ID Certificato / Protocollo
              </label>
              <input
                type="text"
                value={formData.certificationId}
                onChange={(e) => setFormData({ ...formData, certificationId: e.target.value })}
                placeholder="es: PROT-2026-X123"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2 ml-1">
                <CheckCircle2 size={16} className="text-blue-500" />
                Stato
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
              >
                <option value="VALID">Valido</option>
                <option value="EXPIRING">In Scadenza</option>
                <option value="EXPIRED">Scaduto</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 ml-1">Note Aggiuntive</label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none resize-none"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 rounded-2xl font-black text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all"
            >
              ANNULLA
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-[2] py-4 rounded-2xl font-black text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all disabled:opacity-50"
            >
              {loading ? "SALVATAGGIO..." : (record ? "AGGIORNA" : "REGISTRA")}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
