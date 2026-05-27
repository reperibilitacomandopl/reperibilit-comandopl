"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { ShieldAlert, MapPin, Navigation, ArrowRight, ArrowLeft } from "lucide-react"
import toast from "react-hot-toast"
import { format } from "date-fns"
import { StreetSearchAutocomplete } from "@/components/StreetSearchAutocomplete"

export default function NewAccidentReport() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const interventionId = searchParams.get("interventionId")

  const [loading, setLoading] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    address: "",
    lat: "",
    lng: "",
    eventType: "",
    severity: "SOLO_DANNI",
    roadType: "",
    roadGeometry: "",
    roadSignage: "",
    lanesNumber: "",
    speedLimit: "",
    trafficLight: "",
    lighting: "",
    weatherCondition: "SERENO",
    roadCondition: "ASCIUTTA",
    trafficCondition: "REGOLARE",
    safetyChecklist: [] as string[],
  })

  // Se veniamo da un intervento, pre-compiliamo
  useEffect(() => {
    if (interventionId) {
      // In un caso reale faremmo una fetch per ottenere address, lat, lng dall'intervento
      toast("Intervento collegato. Puoi completare i dati.", { icon: "🔗" })
    }
  }, [interventionId])

  const getLocation = () => {
    setGpsLoading(true)
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords
          setFormData(prev => ({ ...prev, lat: String(latitude), lng: String(longitude) }))
          
          try {
            // Reverse geocoding base
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
            const data = await res.json()
            if (data && data.display_name) {
              setFormData(prev => ({ ...prev, address: data.display_name.split(',')[0] }))
            }
          } catch (e) {
            console.error(e)
          }
          
          setGpsLoading(false)
          toast.success("Posizione acquisita")
        },
        (error) => {
          setGpsLoading(false)
          toast.error("Impossibile ottenere la posizione")
        },
        { enableHighAccuracy: true }
      )
    } else {
      setGpsLoading(false)
      toast.error("Geolocalizzazione non supportata")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = {
        ...formData,
        date: new Date(formData.date).toISOString(),
        lat: formData.lat ? parseFloat(formData.lat) : undefined,
        lng: formData.lng ? parseFloat(formData.lng) : undefined,
        lanesNumber: formData.lanesNumber ? parseInt(formData.lanesNumber) : undefined,
        speedLimit: formData.speedLimit ? parseInt(formData.speedLimit) : undefined,
        interventionId: interventionId || undefined
      }

      const res = await fetch("/api/agent/accidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        const data = await res.json()
        toast.success("Sinistro creato in Bozza")
        router.push(`/${params.tenantSlug}/agent/sinistri/${data.id}`)
      } else {
        const err = await res.json()
        toast.error(err.error || "Errore nella creazione")
      }
    } catch (error) {
      toast.error("Errore di rete")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 pb-24 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 bg-gray-100 rounded-full">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="text-xl font-bold text-slate-800">Nuovo Sinistro</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        
        {/* Data e Ora */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Data e Ora *</label>
          <input
            type="datetime-local"
            required
            value={formData.date}
            onChange={(e) => setFormData({...formData, date: e.target.value})}
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none text-gray-900"
          />
        </div>

        {/* Indirizzo e GPS */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Luogo del Sinistro *</label>
          <div className="flex gap-2">
            <div className="flex-1">
              <StreetSearchAutocomplete
                value={formData.address}
                onChange={(val) => setFormData({...formData, address: val})}
                placeholder="Via Roma 10, Altamura"
                theme="light"
              />
            </div>
            <button
              type="button"
              onClick={getLocation}
              disabled={gpsLoading}
              className="p-3 bg-slate-800 text-white rounded-xl shadow-md shrink-0 disabled:opacity-50"
            >
              <Navigation className={`w-5 h-5 ${gpsLoading ? 'animate-pulse' : ''}`} />
            </button>
          </div>
          {formData.lat && <p className="text-xs text-green-600 mt-1">✓ Coordinate GPS acquisite</p>}
        </div>

        {/* Gravità */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Gravità Iniziale *</label>
          <select
            value={formData.severity}
            onChange={(e) => setFormData({...formData, severity: e.target.value})}
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none font-medium"
          >
            <option value="SOLO_DANNI">Solo danni a cose</option>
            <option value="FERITI">Con Feriti</option>
            <option value="RISERVA_PROGNOSI">Prognosi Riservata</option>
            <option value="MORTALE">Mortale</option>
          </select>
          {formData.severity === "MORTALE" && (
            <p className="text-xs text-red-600 font-bold mt-1">⚠️ Attenzione: Procedura Omicidio Stradale art. 589-bis</p>
          )}
        </div>

        {/* Tipo Evento UNI 11472 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Tipo Evento</label>
          <select value={formData.eventType} onChange={e => setFormData({...formData, eventType: e.target.value})}
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900">
            <option value="">Seleziona tipologia</option>
            <option value="TAMPONAMENTO">Tamponamento</option>
            <option value="SCONTRO_FRONTALE">Scontro Frontale</option>
            <option value="SCONTRO_LATERALE">Scontro Laterale</option>
            <option value="INVESTIMENTO_PEDONE">Investimento Pedone</option>
            <option value="USCITA_AUTONOMA">Uscita Autonoma</option>
            <option value="MOTO">Coinvolgimento Moto</option>
            <option value="BICICLETTA">Coinvolgimento Bicicletta</option>
            <option value="FUGA">Veicolo in Fuga</option>
            <option value="MORTALE">Incidente Mortale</option>
          </select>
        </div>

        {/* Dettagli Strada UNI 11472 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Geometria Strada</label>
            <select value={formData.roadGeometry} onChange={e => setFormData({...formData, roadGeometry: e.target.value})}
              className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900">
              <option value="">Seleziona</option>
              <option value="RETTILINEO">Rettilineo</option>
              <option value="CURVA">Curva</option>
              <option value="INCROCIO">Incrocio</option>
              <option value="ROTATORIA">Rotatoria</option>
              <option value="CAVALCAVIA">Cavalcavia/Sottopasso</option>
              <option value="GALLERIA">Galleria</option>
              <option value="RAMPA">Rampa/Uscita</option>
              <option value="PENDENZA">In Pendenza</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Segnaletica</label>
            <select value={formData.roadSignage} onChange={e => setFormData({...formData, roadSignage: e.target.value})}
              className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900">
              <option value="">Seleziona</option>
              <option value="PRESENTE">Presente e Visibile</option>
              <option value="USURATA">Usurata/Sbiadita</option>
              <option value="ASSENTE">Assente</option>
              <option value="COPERTA">Coperta da detriti/neve</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">N. Corsie</label>
            <input type="number" min="1" max="8" value={formData.lanesNumber}
              onChange={e => setFormData({...formData, lanesNumber: e.target.value})}
              placeholder="2" className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Limite (km/h)</label>
            <input type="number" min="10" max="150" value={formData.speedLimit}
              onChange={e => setFormData({...formData, speedLimit: e.target.value})}
              placeholder="50" className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Semaforo</label>
            <select value={formData.trafficLight} onChange={e => setFormData({...formData, trafficLight: e.target.value})}
              className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900">
              <option value="">N/D</option>
              <option value="ASSENTE">Assente</option>
              <option value="FUNZIONANTE">Funzionante</option>
              <option value="GUASTO">Guasto/Lampeggiante</option>
            </select>
          </div>
        </div>

        {/* Checklist Sicurezza */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Checklist Sicurezza</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              "STRADA_CHIUSA", "TRAFFICO_DEVIATO", "VVF_PRESENTI", "118_PRESENTE",
              "AREA_SICURA", "RISCHIO_INCENDIO", "RISCHIO_CARBURANTE", "RISCHIO_ELETTRICO"
            ].map(item => (
              <label key={item} className={`flex items-center gap-2 p-2 rounded-lg text-xs font-medium cursor-pointer border transition-colors ${
                formData.safetyChecklist.includes(item)
                  ? "bg-green-50 border-green-300 text-green-800"
                  : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
              }`}>
                <input type="checkbox" checked={formData.safetyChecklist.includes(item)}
                  onChange={e => {
                    const updated = e.target.checked
                      ? [...formData.safetyChecklist, item]
                      : formData.safetyChecklist.filter(i => i !== item)
                    setFormData({...formData, safetyChecklist: updated})
                  }}
                  className="w-3.5 h-3.5 rounded" />
                {item.replace(/_/g, " ")}
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          {/* Tipo Strada */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Tipo Strada</label>
            <select
              value={formData.roadType}
              onChange={(e) => setFormData({...formData, roadType: e.target.value})}
              className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900"
            >
              <option value="">Seleziona</option>
              <option value="URBANA">Urbana</option>
              <option value="EXTRAURBANA">Extraurbana</option>
              <option value="AUTOSTRADA">Autostrada</option>
            </select>
          </div>
          {/* Illuminazione */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Illuminazione</label>
            <select
              value={formData.lighting}
              onChange={(e) => setFormData({...formData, lighting: e.target.value})}
              className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900"
            >
              <option value="">Seleziona</option>
              <option value="GIORNO">Giorno</option>
              <option value="NOTTE_CON_LUCE">Notte con illuminazione</option>
              <option value="NOTTE_SENZA_LUCE">Notte senza illuminazione</option>
              <option value="ALBA_TRAMONTO">Alba/Tramonto</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          {/* Meteo */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Meteo</label>
            <select
              value={formData.weatherCondition}
              onChange={(e) => setFormData({...formData, weatherCondition: e.target.value})}
              className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900"
            >
              <option value="SERENO">Sereno</option>
              <option value="PIOGGIA">Pioggia</option>
              <option value="NEBBIA">Nebbia</option>
              <option value="NEVE">Neve</option>
            </select>
          </div>
          {/* Strada */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Fondo Stradale</label>
            <select
              value={formData.roadCondition}
              onChange={(e) => setFormData({...formData, roadCondition: e.target.value})}
              className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900"
            >
              <option value="ASCIUTTA">Asciutta</option>
              <option value="BAGNATA">Bagnata</option>
              <option value="GHIACCIATA">Ghiacciata</option>
            </select>
          </div>
        </div>

        <div className="pt-4 mt-4 border-t border-gray-100">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-red-200 flex justify-center items-center gap-2 disabled:opacity-50"
          >
            {loading ? "Creazione in corso..." : "Crea Bozza e Continua"}
            {!loading && <ArrowRight className="w-5 h-5" />}
          </button>
          <p className="text-xs text-center text-gray-400 mt-3">
            Passerai allo step successivo per aggiungere veicoli e persone.
          </p>
        </div>
      </form>
    </div>
  )
}
