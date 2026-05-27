"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { FileText, Calendar, MapPin, ArrowRight, ArrowLeft, Link, X } from "lucide-react"
import toast from "react-hot-toast"
import { format } from "date-fns"

export default function NewServiceReport() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()

  const [formData, setFormData] = useState({
    reportDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    activities: "",
    outcome: "",
    notes: "",
    shiftId: "",
    interventionIds: [] as string[],
    accidentReportIds: [] as string[],
  })
  const [loading, setLoading] = useState(false)
  const [myInterventions, setMyInterventions] = useState<any[]>([])
  const [myAccidents, setMyAccidents] = useState<any[]>([])

  useEffect(() => {
    const prefillIntervention = searchParams.get("interventionId")
    if (prefillIntervention) {
      setFormData((prev) => ({
        ...prev,
        interventionIds: [prefillIntervention],
      }))
    }
    const prefillAccident = searchParams.get("accidentId")
    if (prefillAccident) {
      setFormData((prev) => ({
        ...prev,
        accidentReportIds: [prefillAccident],
      }))
    }
    // Fetch available interventions and accidents for linking
    fetch("/api/agent/interventions")
      .then((r) => { if (r.ok) r.json().then(setMyInterventions) })
      .catch(() => {})
    fetch("/api/agent/accidents")
      .then((r) => { if (r.ok) r.json().then(setMyAccidents) })
      .catch(() => {})
  }, [searchParams])

  const toggleIntervention = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      interventionIds: prev.interventionIds.includes(id)
        ? prev.interventionIds.filter((i) => i !== id)
        : [...prev.interventionIds, id],
    }))
  }

  const toggleAccident = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      accidentReportIds: prev.accidentReportIds.includes(id)
        ? prev.accidentReportIds.filter((i) => i !== id)
        : [...prev.accidentReportIds, id],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.activities.trim().length < 10) {
      toast.error("Descrizione attività troppo breve (min 10 caratteri)")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/agent/service-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          reportDate: new Date(formData.reportDate).toISOString(),
        }),
      })
      if (res.ok) {
        const data = await res.json()
        toast.success("Relazione creata")
        router.push(`/${params.tenantSlug}/agent/relazioni/${data.id}`)
      } else {
        const err = await res.json()
        toast.error(err.error || "Errore durante la creazione")
      }
    } catch (err) {
      toast.error("Errore di connessione")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 pb-24 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-xl bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <FileText className="w-6 h-6 text-teal-600" />
        <h1 className="text-xl font-bold text-slate-800">Nuova Relazione</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Data e Ora *</label>
          <input
            type="datetime-local"
            required
            value={formData.reportDate}
            onChange={(e) => setFormData({ ...formData, reportDate: e.target.value })}
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Attivita Svolte *</label>
          <textarea
            required
            rows={5}
            placeholder="Descrivi le attivita svolte durante il turno (min 10 caratteri)..."
            value={formData.activities}
            onChange={(e) => setFormData({ ...formData, activities: e.target.value })}
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm text-gray-900"
          />
          <p className="text-[10px] text-gray-400 mt-1">{formData.activities.length} caratteri (min 10)</p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Esito</label>
          <textarea
            rows={2}
            placeholder="Esito complessivo del turno (opzionale)..."
            value={formData.outcome}
            onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm text-gray-900"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Note</label>
          <textarea
            rows={2}
            placeholder="Note aggiuntive (opzionale)..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm text-gray-900"
          />
        </div>

        {/* Link Interventions */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
            <Link size={14} /> Interventi Collegati
          </label>
          {myInterventions.length === 0 ? (
            <p className="text-xs text-gray-400">Nessun intervento disponibile</p>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {myInterventions.filter((i) => i.status !== "COMPLETED" && i.status !== "CANCELED").map((interv) => (
                <button
                  key={interv.id}
                  type="button"
                  onClick={() => toggleIntervention(interv.id)}
                  className={`w-full text-left p-2 rounded-lg border text-xs flex justify-between items-center transition-colors ${
                    formData.interventionIds.includes(interv.id)
                      ? "bg-teal-50 border-teal-300 text-teal-800"
                      : "bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <span>{interv.type} - {interv.address}</span>
                  {formData.interventionIds.includes(interv.id) && <X size={12} />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Link Accidents */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
            <Link size={14} /> Sinistri Collegati
          </label>
          {myAccidents.length === 0 ? (
            <p className="text-xs text-gray-400">Nessun sinistro disponibile</p>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {myAccidents.filter((a) => a.status !== "CHIUSO").map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => toggleAccident(acc.id)}
                  className={`w-full text-left p-2 rounded-lg border text-xs flex justify-between items-center transition-colors ${
                    formData.accidentReportIds.includes(acc.id)
                      ? "bg-teal-50 border-teal-300 text-teal-800"
                      : "bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <span>{acc.protocolNumber || "Sinistro"} - {acc.address}</span>
                  {formData.accidentReportIds.includes(acc.id) && <X size={12} />}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-2xl text-sm font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-teal-200 flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
          ) : (
            <ArrowRight size={18} />
          )}
          Salva Relazione
        </button>
      </form>
    </div>
  )
}
