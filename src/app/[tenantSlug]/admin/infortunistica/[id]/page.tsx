"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Car, Users, Info, CheckCircle, FileText, Unlock } from "lucide-react"
import toast from "react-hot-toast"
import { format } from "date-fns"

export default function AdminAccidentDetail() {
  const router = useRouter()
  const params = useParams()
  const accidentId = params.id as string

  const [accident, setAccident] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("info")

  const fetchAccident = async () => {
    try {
      const res = await fetch(`/api/agent/accidents/${accidentId}`) // Posso riutilizzare la stessa API se ha auth checks corretti o usare admin
      if (res.ok) {
        const data = await res.json()
        setAccident(data)
      }
    } catch (e) {
      toast.error("Errore di rete")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAccident()
  }, [accidentId])

  const changeStatus = async (action: string, reason?: string) => {
    try {
      const res = await fetch(`/api/agent/accidents/${accidentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason })
      })
      if (res.ok) {
        toast.success("Stato aggiornato con successo")
        fetchAccident()
      } else {
        const err = await res.json()
        toast.error(err.error || "Errore durante l'aggiornamento")
      }
    } catch (e) {
      toast.error("Errore di rete")
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Caricamento in corso...</div>
  if (!accident) return <div className="p-8 text-center text-gray-500">Fascicolo non trovato</div>

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.push(`/${params.tenantSlug}/admin/infortunistica`)} className="p-2 bg-white border border-gray-200 rounded-full hover:bg-gray-50">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Fascicolo {accident.protocolNumber || "Bozza"}</h1>
          <p className="text-gray-500">Rilevato il {format(new Date(accident.date), "dd/MM/yyyy HH:mm")}</p>
        </div>
        
        <div className="ml-auto flex gap-2">
          <button 
            onClick={() => window.open(`/api/agent/accidents/${accidentId}/pdf`, "_blank")}
            className="px-4 py-2 bg-blue-50 text-blue-700 font-bold rounded-lg flex items-center gap-2 border border-blue-200 hover:bg-blue-100"
          >
            <FileText className="w-5 h-5" /> Stampa PDF
          </button>
          
          {accident.status === "REVISIONATO" && (
            <button 
              onClick={() => changeStatus("CLOSE")}
              className="px-4 py-2 bg-green-600 text-white font-bold rounded-lg flex items-center gap-2 hover:bg-green-700 shadow-md"
            >
              <CheckCircle className="w-5 h-5" /> Chiudi Fascicolo
            </button>
          )}

          {accident.status === "CHIUSO" && (
            <button 
              onClick={() => {
                const reason = prompt("Inserisci motivazione per la riapertura:")
                if (reason) changeStatus("REOPEN", reason)
              }}
              className="px-4 py-2 bg-red-50 text-red-700 font-bold rounded-lg flex items-center gap-2 border border-red-200 hover:bg-red-100"
            >
              <Unlock className="w-5 h-5" /> Riapri Fascicolo
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-4 border-b border-gray-200">
        <button onClick={() => setActiveTab("info")} className={`pb-3 px-4 font-bold ${activeTab === "info" ? "border-b-2 border-red-600 text-red-600" : "text-gray-500"}`}>
          <div className="flex items-center gap-2"><Info className="w-4 h-4"/> Dati Generali</div>
        </button>
        <button onClick={() => setActiveTab("veicoli")} className={`pb-3 px-4 font-bold ${activeTab === "veicoli" ? "border-b-2 border-red-600 text-red-600" : "text-gray-500"}`}>
          <div className="flex items-center gap-2"><Car className="w-4 h-4"/> Veicoli ({accident.vehicles?.length || 0})</div>
        </button>
        <button onClick={() => setActiveTab("persone")} className={`pb-3 px-4 font-bold ${activeTab === "persone" ? "border-b-2 border-red-600 text-red-600" : "text-gray-500"}`}>
          <div className="flex items-center gap-2"><Users className="w-4 h-4"/> Persone ({accident.people?.length || 0})</div>
        </button>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 min-h-[400px]">
        {activeTab === "info" && (
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="font-bold text-lg text-slate-800 border-b pb-2">Informazioni Principali</h3>
              <div><span className="text-gray-500 block text-sm">Indirizzo</span><span className="font-medium">{accident.address}</span></div>
              <div><span className="text-gray-500 block text-sm">Gravità</span><span className="font-medium">{accident.severity.replace("_", " ")}</span></div>
              <div><span className="text-gray-500 block text-sm">Condizioni Meteo</span><span className="font-medium">{accident.weatherCondition}</span></div>
              <div><span className="text-gray-500 block text-sm">Condizioni Fondo Stradale</span><span className="font-medium">{accident.roadCondition}</span></div>
              <div><span className="text-gray-500 block text-sm">Stato Attuale</span><span className="font-medium px-2 py-1 bg-gray-100 rounded">{accident.status}</span></div>
            </div>
            <div className="space-y-4">
              <h3 className="font-bold text-lg text-slate-800 border-b pb-2">Dinamica (Bozza Agente)</h3>
              <div className="bg-gray-50 p-4 rounded-lg text-sm whitespace-pre-wrap text-gray-700 min-h-[150px]">
                {accident.dynamicDescription || "Nessuna dinamica inserita dall'agente."}
              </div>
            </div>
          </div>
        )}

        {activeTab === "veicoli" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-slate-800">Veicoli Coinvolti</h3>
              <button className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-sm font-bold border border-red-200">
                + Aggiungi Veicolo
              </button>
            </div>
            {accident.vehicles?.map((v: any) => (
              <div key={v.id} className="p-4 border border-gray-100 rounded-lg flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-100 p-3 rounded-full"><Car className="w-5 h-5 text-blue-600"/></div>
                  <div>
                    <h4 className="font-bold text-slate-800">{v.licensePlate}</h4>
                    <p className="text-sm text-gray-500">{v.vehicleType} • Assicurazione: {v.insuranceCompany || "N/D"}</p>
                  </div>
                </div>
                <button className="text-blue-600 text-sm font-bold">Modifica</button>
              </div>
            ))}
          </div>
        )}

        {activeTab === "persone" && (
          <div className="space-y-4">
             <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-slate-800">Persone Coinvolte</h3>
              <button className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-sm font-bold border border-red-200">
                + Aggiungi Persona
              </button>
            </div>
            {accident.people?.map((p: any) => (
              <div key={p.id} className="p-4 border border-gray-100 rounded-lg flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className="bg-purple-100 p-3 rounded-full"><Users className="w-5 h-5 text-purple-600"/></div>
                  <div>
                    <h4 className="font-bold text-slate-800">{p.firstName} {p.lastName}</h4>
                    <p className="text-sm text-gray-500">Ruolo: {p.role} • Lesioni: {p.injuries || "Nessuna"}</p>
                  </div>
                </div>
                <button className="text-blue-600 text-sm font-bold">Modifica</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
