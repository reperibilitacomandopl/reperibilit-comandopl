"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Car, Users, Camera, Info, CheckCircle, Upload } from "lucide-react"
import toast from "react-hot-toast"
import { format } from "date-fns"

export default function AccidentDetail() {
  const router = useRouter()
  const params = useParams()
  const accidentId = params.id as string

  const [accident, setAccident] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("info") // info, veicoli, persone, foto

  const fetchAccident = async () => {
    try {
      const res = await fetch(`/api/agent/accidents/${accidentId}`)
      if (res.ok) {
        const data = await res.json()
        setAccident(data)
      } else {
        toast.error("Errore nel caricamento")
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

  const submitCompilation = async () => {
    try {
      const res = await fetch(`/api/agent/accidents/${accidentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SUBMIT_COMPILATION" })
      })
      if (res.ok) {
        toast.success("Inviato in Revisione!")
        fetchAccident()
      } else {
        const err = await res.json()
        toast.error(err.error || "Impossibile inviare")
      }
    } catch (e) {
      toast.error("Errore di rete")
    }
  }

  if (loading) return <div className="p-4 text-center">Caricamento...</div>
  if (!accident) return <div className="p-4 text-center">Sinistro non trovato</div>

  return (
    <div className="pb-24">
      {/* Header Fissato */}
      <div className="bg-slate-800 text-white p-4 sticky top-0 z-10 shadow-md">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push(`/${params.tenantSlug}/agent/sinistri`)} className="p-2 bg-slate-700 rounded-full">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <h1 className="font-bold">{accident.protocolNumber || "Bozza Sinistro"}</h1>
            <p className="text-xs text-slate-300 truncate max-w-[250px]">{accident.address}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex justify-between mt-6 text-sm font-medium">
          <button onClick={() => setActiveTab("info")} className={`pb-2 px-2 border-b-2 ${activeTab === "info" ? "border-red-500 text-white" : "border-transparent text-slate-400"}`}>
            Info
          </button>
          <button onClick={() => setActiveTab("veicoli")} className={`pb-2 px-2 border-b-2 ${activeTab === "veicoli" ? "border-red-500 text-white" : "border-transparent text-slate-400"}`}>
            Veicoli ({accident.vehicles?.length || 0})
          </button>
          <button onClick={() => setActiveTab("persone")} className={`pb-2 px-2 border-b-2 ${activeTab === "persone" ? "border-red-500 text-white" : "border-transparent text-slate-400"}`}>
            Persone ({accident.people?.length || 0})
          </button>
          <button onClick={() => setActiveTab("foto")} className={`pb-2 px-2 border-b-2 ${activeTab === "foto" ? "border-red-500 text-white" : "border-transparent text-slate-400"}`}>
            Foto
          </button>
        </div>
      </div>

      <div className="p-4">
        {/* TAB INFO */}
        {activeTab === "info" && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-500" /> Dettagli Generali
              </h2>
              <div className="space-y-2 text-sm text-gray-600">
                <p><b>Data:</b> {format(new Date(accident.date), "dd/MM/yyyy HH:mm")}</p>
                <p><b>Gravità:</b> {accident.severity}</p>
                <p><b>Meteo:</b> {accident.weatherCondition}</p>
                <p><b>Stato:</b> {accident.status}</p>
              </div>
            </div>

            {accident.status === "BOZZA" && (
              <button 
                onClick={submitCompilation}
                className="w-full bg-green-600 text-white font-bold py-4 rounded-xl shadow-md flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" /> Invia in Revisione
              </button>
            )}
          </div>
        )}

        {/* TAB VEICOLI */}
        {activeTab === "veicoli" && (
          <div className="space-y-4">
            <button className="w-full bg-blue-50 text-blue-700 border border-blue-200 border-dashed py-4 rounded-xl font-bold flex items-center justify-center gap-2">
              <Car className="w-5 h-5" /> Aggiungi Veicolo
            </button>
            
            {accident.vehicles?.map((v: any) => (
              <div key={v.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="bg-blue-100 p-3 rounded-full">
                  <Car className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{v.licensePlate}</h3>
                  <p className="text-sm text-gray-500">{v.vehicleType} • {v.insuranceCompany || "Nessuna assic. nota"}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB PERSONE */}
        {activeTab === "persone" && (
          <div className="space-y-4">
            <button className="w-full bg-purple-50 text-purple-700 border border-purple-200 border-dashed py-4 rounded-xl font-bold flex items-center justify-center gap-2">
              <Users className="w-5 h-5" /> Aggiungi Persona
            </button>

            {accident.people?.map((p: any) => (
              <div key={p.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="bg-purple-100 p-3 rounded-full">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{p.firstName} {p.lastName}</h3>
                  <p className="text-sm text-gray-500">{p.role} • {p.injuries || "Nessuna lesione"}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB FOTO */}
        {activeTab === "foto" && (
          <div className="space-y-4">
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-200 text-sm text-orange-800">
              Usa la fotocamera per scattare foto ai veicoli o alla planimetria. Le immagini vengono caricate in modo sicuro (S3 pre-signed).
            </div>
            <button className="w-full bg-slate-800 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md">
              <Camera className="w-5 h-5" /> Scatta Foto
            </button>
            <button className="w-full bg-white text-slate-800 border border-slate-200 py-4 rounded-xl font-bold flex items-center justify-center gap-2">
              <Upload className="w-5 h-5" /> Scegli dalla Galleria
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
