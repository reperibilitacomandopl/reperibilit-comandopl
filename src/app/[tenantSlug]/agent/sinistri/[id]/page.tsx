"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Car, Users, Camera, Info, CheckCircle, Upload, X, AlertTriangle, ShieldAlert, Ruler, ClipboardCheck, Plus, Trash2, FileText, Save } from "lucide-react"
import toast from "react-hot-toast"
import { format } from "date-fns"
import { SignaturePad } from "@/components/SignaturePad"

// --- ISTAT constants ---
const VEHICLE_TYPES = ["Autovettura", "Motociclo", "Ciclomotore", "Autocarro", "Autobus", "Bicicletta", "Veicolo Commerciale", "Macchina Agricola", "Altro"]
const ROLES = ["CONDUCENTE", "PASSEGGERO", "PEDONE", "TESTIMONE"]
const INJURIES = ["NESSUNA", "LIEVI", "GRAVI", "MORTALE"]
const DIRECTIONS = ["Nord", "Sud", "Est", "Ovest", "Nord-Est", "Nord-Ovest", "Sud-Est", "Sud-Ovest", "Ferma/Sosta"]
const MANEUVERS = ["Marcia Normale", "Svolta a Sinistra", "Svolta a Destra", "Sorpasso", "Inversione", "Retromarcia", "Frenata", "Parcheggio", "Uscita da Parcheggio"]
const LICENSE_CATEGORIES = ["AM", "A1", "A2", "A", "B", "BE", "C", "CE", "D", "DE", "Nessuna"]
const ROAD_TYPES = ["Urbana", "Extraurbana", "Autostrada"]
const LIGHTING_CONDITIONS = ["Giorno", "Notte con illuminazione", "Notte senza illuminazione", "Alba/Tramonto"]
const WEATHER = ["Sereno", "Pioggia", "Nebbia", "Neve", "Grandine", "Vento Forte"]
const ROAD_CONDITIONS = ["Asciutto", "Bagnato", "Ghiacciato", "Sconnesso", "In lavori"]
const TRAFFIC = ["Scarso", "Normale", "Intenso", "Bloccato"]

export default function AccidentDetail() {
  const router = useRouter()
  const params = useParams()
  const accidentId = params.id as string

  const [accident, setAccident] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("info")

  // Vehicle modal
  const [showVehicleModal, setShowVehicleModal] = useState(false)
  const [vehicleForm, setVehicleForm] = useState({
    licensePlate: "", vehicleType: "Autovettura", vin: "", directionOfTravel: "", maneuver: "",
    isFugitive: false, insuranceCompany: "", insurancePolicy: "", revisionDate: "",
    damageDescription: "", damageAreas: [] as string[], deformationType: "", airbagDeployed: false, tireCondition: "",
  })
  const [savingVehicle, setSavingVehicle] = useState(false)

  // Person modal
  const [showPersonModal, setShowPersonModal] = useState(false)
  const [personForm, setPersonForm] = useState({
    role: "CONDUCENTE", firstName: "", lastName: "", fiscalCode: "", documentType: "",
    licenseCategory: "", seatbeltUsed: false, isFugitive: false,
    injuries: "", injuriesDetail: "", alcoholTest: "", drugTest: "",
    statement: "", contactPhone: "", email: "",
    vehicleIndex: -1 as number | null,
  })
  const [savingPerson, setSavingPerson] = useState(false)

  // Narrative
  const [narrative, setNarrative] = useState("")
  const [savingNarrative, setSavingNarrative] = useState(false)

  // Traces
  const [traces, setTraces] = useState<any[]>([])
  const [showTraceModal, setShowTraceModal] = useState(false)
  const [traceForm, setTraceForm] = useState({ code: "", type: "", position: "", measurement: "", dimensions: "", description: "" })
  const [savingTrace, setSavingTrace] = useState(false)

  // Security
  const [safetyChecklist, setSafetyChecklist] = useState<string[]>([])
  const [safetySignature, setSafetySignature] = useState("")

  const fetchAccident = async () => {
    try {
      const res = await fetch(`/api/agent/accidents/${accidentId}`)
      if (res.ok) {
        const data = await res.json()
        setAccident(data)
        setNarrative(data.narrativeReport || "")
        setSafetyChecklist(data.safetyChecklist || [])
        setSafetySignature(data.safetySignature || "")
      }
      else toast.error("Errore nel caricamento")
    } catch { toast.error("Errore di rete") }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchAccident(); fetchTraces() }, [accidentId])

  const fetchTraces = async () => {
    try {
      const res = await fetch(`/api/agent/accidents/${accidentId}/traces`)
      if (res.ok) setTraces(await res.json())
    } catch {}
  }

  const submitCompilation = async () => {
    try {
      const res = await fetch(`/api/agent/accidents/${accidentId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SUBMIT_COMPILATION" }),
      })
      if (res.ok) { toast.success("Inviato in Revisione!"); fetchAccident() }
      else toast.error((await res.json()).error || "Impossibile inviare")
    } catch { toast.error("Errore di rete") }
  }

  // --- Vehicle save ---
  const handleSaveVehicle = async () => {
    if (!vehicleForm.licensePlate.trim() && !vehicleForm.isFugitive) {
      toast.error("Inserire targa o selezionare Veicolo in Fuga"); return
    }
    setSavingVehicle(true)
    try {
      const res = await fetch(`/api/agent/accidents/${accidentId}/vehicles`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...vehicleForm,
          licensePlate: vehicleForm.isFugitive ? "FUGITIVO" : vehicleForm.licensePlate,
        }),
      })
      if (res.ok) {
        toast.success("Veicolo aggiunto")
        setShowVehicleModal(false)
        setVehicleForm({ licensePlate: "", vehicleType: "Autovettura", vin: "", directionOfTravel: "", maneuver: "", isFugitive: false, insuranceCompany: "", insurancePolicy: "", revisionDate: "", damageDescription: "", damageAreas: [], deformationType: "", airbagDeployed: false, tireCondition: "" })
        fetchAccident()
      } else toast.error((await res.json()).error || "Errore")
    } catch { toast.error("Errore di rete") }
    finally { setSavingVehicle(false) }
  }

  // --- Person save ---
  const handleSavePerson = async () => {
    if (!personForm.firstName.trim() && !personForm.isFugitive) {
      toast.error("Inserire nome o selezionare Fuga"); return
    }
    setSavingPerson(true)
    try {
      const res = await fetch(`/api/agent/accidents/${accidentId}/people`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(personForm),
      })
      if (res.ok) {
        toast.success("Persona aggiunta")
        setShowPersonModal(false)
        setPersonForm({ role: "CONDUCENTE", firstName: "", lastName: "", fiscalCode: "", documentType: "", licenseCategory: "", seatbeltUsed: false, isFugitive: false, injuries: "", injuriesDetail: "", alcoholTest: "", drugTest: "", statement: "", contactPhone: "", email: "", vehicleIndex: null })
        fetchAccident()
      } else toast.error((await res.json()).error || "Errore")
    } catch { toast.error("Errore di rete") }
    finally { setSavingPerson(false) }
  }

  // --- Trace save ---
  const handleSaveTrace = async () => {
    if (!traceForm.code.trim() || !traceForm.type.trim()) { toast.error("Codice e tipo obbligatori"); return }
    setSavingTrace(true)
    try {
      const res = await fetch(`/api/agent/accidents/${accidentId}/traces`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(traceForm),
      })
      if (res.ok) {
        toast.success("Traccia aggiunta")
        setShowTraceModal(false)
        setTraceForm({ code: "", type: "", position: "", measurement: "", dimensions: "", description: "" })
        fetchTraces()
      } else toast.error((await res.json()).error || "Errore")
    } catch { toast.error("Errore di rete") }
    finally { setSavingTrace(false) }
  }

  // --- Auto-generate narrative ---
  const autoGenerateNarrative = () => {
    if (!accident) return
    const lines: string[] = []
    lines.push(`RELAZIONE DI SINISTRO STRADALE`)
    lines.push(`Protocollo: ${accident.protocolNumber || "Bozza"}`)
    lines.push(`Data: ${new Date(accident.date).toLocaleString("it-IT")}`)
    lines.push(`Luogo: ${accident.address}`)
    lines.push(`Tipo Evento: ${accident.eventType || "n/d"} | Gravità: ${accident.severity || "n/d"}`)
    lines.push("")
    lines.push("=== CONDIZIONI AMBIENTALI ===")
    lines.push(`Strada: ${accident.roadType || "n/d"} | Geometria: ${accident.roadGeometry || "n/d"} | Corsie: ${accident.lanesNumber || "n/d"}`)
    lines.push(`Segnaletica: ${accident.roadSignage || "n/d"} | Semaforo: ${accident.trafficLight || "n/d"} | Limite: ${accident.speedLimit ? accident.speedLimit + " km/h" : "n/d"}`)
    lines.push(`Meteo: ${accident.weatherCondition || "n/d"} | Fondo: ${accident.roadCondition || "n/d"} | Illuminazione: ${accident.lighting || "n/d"} | Traffico: ${accident.trafficCondition || "n/d"}`)
    if (accident.safetyChecklist?.length > 0) {
      lines.push(`Messa in sicurezza: ${accident.safetyChecklist.map((s: string) => s.replace(/_/g, " ")).join(", ")}`)
    }
    lines.push("")
    lines.push("=== VEICOLI COINVOLTI ===")
    if (accident.vehicles?.length > 0) {
      accident.vehicles.forEach((v: any, i: number) => {
        lines.push(`Veicolo ${i + 1}: ${v.isFugitive ? "IN FUGA" : v.licensePlate} - ${v.vehicleType}`)
        if (!v.isFugitive && v.vin) lines.push(`  Telaio/VIN: ${v.vin}`)
        lines.push(`  Direzione: ${v.directionOfTravel || "n/d"} | Manovra: ${v.maneuver || "n/d"}`)
        if (v.insuranceCompany) lines.push(`  Assicurazione: ${v.insuranceCompany}${v.insurancePolicy ? " (Pol. " + v.insurancePolicy + ")" : ""}`)
        if (v.damageAreas?.length > 0) lines.push(`  Aree danneggiate: ${v.damageAreas.join(", ")}`)
        if (v.deformationType) lines.push(`  Deformazione: ${v.deformationType}`)
        if (v.airbagDeployed) lines.push(`  Airbag attivati: SI`)
        if (v.tireCondition) lines.push(`  Pneumatici: ${v.tireCondition}`)
        if (v.damageDescription) lines.push(`  Descrizione danni: ${v.damageDescription}`)
        const occupants = accident.people?.filter((p: any) => p.accidentVehicleId === v.id)
        if (occupants?.length > 0) {
          lines.push(`  Occupanti:`)
          occupants.forEach((p: any) => {
            lines.push(`    - ${p.role}: ${p.isFugitive ? "IN FUGA" : p.firstName + " " + p.lastName}${p.injuries && p.injuries !== "NESSUNA" ? " (Lesioni: " + p.injuries + ")" : ""}${p.seatbeltUsed !== null ? (p.seatbeltUsed ? " [Cintura/Casco: SI]" : " [Cintura/Casco: NO]") : ""}`)
          })
        }
        lines.push("")
      })
    } else { lines.push("Nessun veicolo inserito."); lines.push("") }
    lines.push("=== PERSONE COINVOLTE (PEDONI/TESTIMONI) ===")
    const others = accident.people?.filter((p: any) => !p.accidentVehicleId) || []
    if (others.length > 0) {
      others.forEach((p: any) => {
        lines.push(`- ${p.role}: ${p.isFugitive ? "IN FUGA" : p.firstName + " " + p.lastName} | CF: ${p.fiscalCode || "n/d"}${p.injuries && p.injuries !== "NESSUNA" ? " | Lesioni: " + p.injuries : ""}${p.contactPhone ? " | Tel: " + p.contactPhone : ""}${p.email ? " | Email: " + p.email : ""}`)
        if (p.statement) lines.push(`  Dichiarazione: "${p.statement}"`)
      })
      lines.push("")
    } else { lines.push("Nessun pedone/testimone."); lines.push("") }
    lines.push("=== TRACCE E REPERTI ===")
    if (traces.length > 0) {
      traces.forEach((t: any) => {
        lines.push(`- ${t.code}: ${t.type.replace(/_/g, " ")} | Pos: ${t.position || "n/d"} | Misura: ${t.measurement || "n/d"} | Dim: ${t.dimensions || "n/d"}`)
        if (t.description) lines.push(`  ${t.description}`)
      })
      lines.push("")
    } else { lines.push("Nessuna traccia catalogata."); lines.push("") }
    lines.push("=== DINAMICA DEL SINISTRO ===")
    lines.push(accident.dynamicDescription || "(Da compilare)")
    lines.push("")
    lines.push("=== NOTE E OSSERVAZIONI ===")
    lines.push("")
    setNarrative(lines.join("\n"))
    toast.success("Relazione generata dai dati raccolti")
  }

  const saveNarrative = async () => {
    setSavingNarrative(true)
    try {
      const res = await fetch(`/api/agent/accidents/${accidentId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ narrativeReport: narrative }),
      })
      if (res.ok) toast.success("Relazione salvata")
      else toast.error("Errore nel salvataggio")
    } catch { toast.error("Errore di rete") }
    finally { setSavingNarrative(false) }
  }

  const handleDeleteVehicle = async (vehicleId: string) => {
    if (!confirm("Eliminare questo veicolo?")) return
    try {
      const res = await fetch(`/api/agent/accidents/${accidentId}/vehicles?vehicleId=${vehicleId}`, { method: "DELETE" })
      if (res.ok) { toast.success("Veicolo rimosso"); fetchAccident() }
      else toast.error("Impossibile eliminare")
    } catch { toast.error("Errore di rete") }
  }

  const handleDeletePerson = async (personId: string) => {
    if (!confirm("Eliminare questa persona?")) return
    try {
      const res = await fetch(`/api/agent/accidents/${accidentId}/people?personId=${personId}`, { method: "DELETE" })
      if (res.ok) { toast.success("Persona rimossa"); fetchAccident() }
      else toast.error("Impossibile eliminare")
    } catch { toast.error("Errore di rete") }
  }

  const handleSaveSecurity = async () => {
    if (!safetySignature) { toast.error("La firma è obbligatoria per completare la messa in sicurezza"); return }
    try {
      const res = await fetch(`/api/agent/accidents/${accidentId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ safetyChecklist, safetySignature }),
      })
      if (res.ok) { toast.success("Messa in Sicurezza salvata"); fetchAccident(); setActiveTab("tracce") }
      else toast.error("Impossibile salvare la sicurezza")
    } catch { toast.error("Errore di rete") }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    try {
      const arrayBuffer = await file.arrayBuffer()
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

      const reader = new FileReader()
      reader.onloadend = async () => {
        const url = reader.result as string
        const res = await fetch(`/api/agent/accidents/${accidentId}/photos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url,
            hashSha256: hashHex,
            category: "PANORAMICA",
            gpsLat: accident.lat,
            gpsLng: accident.lng
          })
        })
        if (res.ok) {
          toast.success("Foto forense acquisita")
          fetchAccident()
        } else {
          toast.error("Errore salvataggio foto")
          setLoading(false)
        }
      }
      reader.readAsDataURL(file)
    } catch (error) {
      toast.error("Errore durante il caricamento")
      setLoading(false)
    }
  }

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm("Eliminare questa foto? L'hash andrà perso.")) return
    try {
      const res = await fetch(`/api/agent/accidents/${accidentId}/photos?photoId=${photoId}`, { method: "DELETE" })
      if (res.ok) { toast.success("Foto rimossa"); fetchAccident() }
      else toast.error("Impossibile eliminare")
    } catch { toast.error("Errore di rete") }
  }

  const TRACE_TYPES = ["FRENATA", "ABRASIONE", "INCISIONE", "SCALFITTURA", "LIQUIDO", "SANGUE", "VETRO", "PLASTICA", "PARTE_MECCANICA", "DETRITO", "ALTRO"]
  const DAMAGE_AREAS = ["Frontale", "Laterale DX", "Laterale SX", "Posteriore", "Tetto", "Sottoscocca"]

  if (loading) return <div className="p-4 text-center text-gray-500"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500 mx-auto"></div></div>
  if (!accident) return <div className="p-4 text-center text-gray-500">Sinistro non trovato</div>

  const sevLabels: Record<string, string> = { SOLO_DANNI: "Danni a Cose", FERITI: "Con Feriti", MORTALE: "Mortale", RISERVA_PROGNOSI: "Prognosi Riservata" }
  const statusLabels: Record<string, string> = { BOZZA: "Bozza", IN_COMPILAZIONE: "In Compilazione", REVISIONATO: "Revisionato", CHIUSO: "Chiuso" }

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="bg-slate-800 text-white p-4 sticky top-0 z-10 shadow-md">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push(`/${params.tenantSlug}/agent/sinistri`)} className="p-2 bg-slate-700 rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold">{accident.protocolNumber || "Bozza Sinistro"}</h1>
            <p className="text-xs text-slate-300 truncate max-w-[250px]">{accident.address}</p>
          </div>
        </div>

        <div className="flex justify-between mt-6 text-sm font-medium overflow-x-auto gap-4 pb-2 px-1 scrollbar-hide">
          {[
            { id: "info", label: "1. Info", done: true },
            { id: "sicurezza", label: "2. Sicurezza", done: accident.safetyChecklist?.length > 0 && !!accident.safetySignature },
            { id: "tracce", label: "3. Tracce", done: traces.length > 0 },
            { id: "foto", label: "4. Foto", done: accident.photos?.length >= 4 },
            { id: "veicoli", label: `5. Veicoli (${accident.vehicles?.length || 0})`, done: accident.vehicles?.length > 0 },
            { id: "persone", label: `6. Persone (${accident.people?.length || 0})`, done: accident.people?.length > 0 },
            { id: "relazione", label: "7. Relazione", done: !!narrative }
          ].map((step, idx) => (
            <button key={step.id} onClick={() => setActiveTab(step.id)}
              className="flex-shrink-0 flex flex-col items-center gap-1 min-w-[60px] hover:opacity-80 transition-opacity">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                activeTab === step.id ? "bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/30" : 
                step.done ? "bg-green-500 border-green-500 text-white" : 
                "bg-slate-800 border-slate-600 text-slate-300"
              }`}>
                {step.done && activeTab !== step.id ? "✓" : (idx + 1)}
              </div>
              <span className={`text-[10px] uppercase font-bold text-center leading-tight ${activeTab === step.id ? "text-white" : "text-slate-400"}`}>
                {step.label.split('. ')[1]}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        {/* TAB INFO */}
        {activeTab === "info" && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><Info className="w-5 h-5 text-blue-500" /> Dati Sinistro</h2>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                <p><b>Data:</b> {format(new Date(accident.date), "dd/MM/yyyy HH:mm")}</p>
                <p><b>Gravità:</b> {sevLabels[accident.severity] || accident.severity}</p>
                <p><b>Tipo Strada:</b> {accident.roadType || "n/d"}</p>
                <p><b>Illuminazione:</b> {accident.lighting || "n/d"}</p>
                <p><b>Meteo:</b> {accident.weatherCondition || "n/d"}</p>
                <p><b>Fondo:</b> {accident.roadCondition || "n/d"}</p>
                <p><b>Traffico:</b> {accident.trafficCondition || "n/d"}</p>
                <p><b>Stato:</b> {statusLabels[accident.status] || accident.status}</p>
              </div>
              {accident.dynamicDescription && (
                <div className="mt-3 pt-3 border-t">
                  <b className="text-xs text-gray-500 uppercase">Dinamica:</b>
                  <p className="text-sm mt-1">{accident.dynamicDescription}</p>
                </div>
              )}
            </div>

            {accident.status === "BOZZA" && (
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" /> Riepilogo Requisiti UNI 11472
                </h3>
                <ul className="space-y-2 text-sm mb-4">
                  <li className="flex items-center gap-2">
                    <span className={accident.safetyChecklist?.length > 0 && !!accident.safetySignature ? "text-green-500" : "text-gray-400"}>{accident.safetyChecklist?.length > 0 && !!accident.safetySignature ? "✓" : "○"}</span>
                    <span className={!(accident.safetyChecklist?.length > 0 && !!accident.safetySignature) ? "text-red-600 font-medium" : "text-gray-600"}>Messa in Sicurezza (Checklist e Firma)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className={traces.length > 0 ? "text-green-500" : "text-gray-400"}>{traces.length > 0 ? "✓" : "○"}</span>
                    <span className={traces.length === 0 ? "text-amber-600 font-medium" : "text-gray-600"}>Almeno 1 Traccia / Reperto catalogato</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className={(accident.forensicPhotos?.length || 0) >= 4 ? "text-green-500" : "text-gray-400"}>{(accident.forensicPhotos?.length || 0) >= 4 ? "✓" : "○"}</span>
                    <span className={(accident.forensicPhotos?.length || 0) < 4 ? "text-red-600 font-medium" : "text-gray-600"}>Almeno 4 Foto Panoramiche</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className={accident.vehicles?.length > 0 ? "text-green-500" : "text-gray-400"}>{accident.vehicles?.length > 0 ? "✓" : "○"}</span>
                    <span className={!accident.vehicles?.length ? "text-red-600 font-medium" : "text-gray-600"}>Almeno 1 Veicolo inserito</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className={accident.people?.length > 0 ? "text-green-500" : "text-gray-400"}>{accident.people?.length > 0 ? "✓" : "○"}</span>
                    <span className={!accident.people?.length ? "text-red-600 font-medium" : "text-gray-600"}>Almeno 1 Persona inserita</span>
                  </li>
                </ul>

                {accident.safetyChecklist?.length > 0 && !!accident.safetySignature && (accident.forensicPhotos?.length || 0) >= 4 && accident.vehicles?.length > 0 && accident.people?.length > 0 ? (
                  <button onClick={submitCompilation}
                    className="w-full bg-green-600 text-white font-bold py-4 rounded-xl shadow-md flex items-center justify-center gap-2">
                    <CheckCircle className="w-5 h-5" /> Invia in Revisione
                  </button>
                ) : (
                  <div className="text-center p-3 bg-red-50 text-red-600 rounded-lg text-xs font-bold border border-red-200">
                    Completa i requisiti mancanti (in rosso) per inviare in revisione.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB RELAZIONE */}
        {activeTab === "relazione" && (
          <div className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              {accident.status !== "CHIUSO" && (
                <button onClick={autoGenerateNarrative}
                  className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all">
                  <FileText size={14} /> Auto-genera dai dati
                </button>
              )}
              {accident.status !== "CHIUSO" && (
                <button onClick={saveNarrative} disabled={savingNarrative}
                  className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all">
                  {savingNarrative ? <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-white"></div> : <Save size={14} />}
                  Salva Relazione
                </button>
              )}
            </div>

            {accident.status !== "CHIUSO" ? (
              <textarea
                value={narrative}
                onChange={e => setNarrative(e.target.value)}
                placeholder="Scrivi qui la relazione discorsiva del sinistro oppure usa 'Auto-genera dai dati' per creare una bozza dai dati raccolti nelle altre schede..."
                rows={20}
                className="w-full p-4 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 font-mono leading-relaxed resize-y focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                style={{ minHeight: "60vh" }}
              />
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">{accident.narrativeReport || "(Nessuna relazione compilata)"}</pre>
              </div>
            )}
          </div>
        )}

        {/* TAB VEICOLI */}
        {activeTab === "veicoli" && (
          <div className="space-y-4">
            {(accident.status !== "CHIUSO") && (
              <button onClick={() => setShowVehicleModal(true)}
                className="w-full bg-blue-50 text-blue-700 border border-blue-200 border-dashed py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-100 transition-colors">
                <Car className="w-5 h-5" /> Aggiungi Veicolo
              </button>
            )}

            {accident.vehicles?.map((v: any, idx: number) => (
              <div key={v.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative">
                {accident.status !== "CHIUSO" && (
                  <button onClick={() => handleDeleteVehicle(v.id)} className="absolute top-2 right-2 p-1.5 rounded-full bg-gray-100 hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors z-10">
                    <Trash2 size={14} />
                  </button>
                )}
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-full ${v.isFugitive ? 'bg-red-100' : 'bg-blue-100'}`}>
                    {v.isFugitive ? <ShieldAlert className="w-6 h-6 text-red-600" /> : <Car className="w-6 h-6 text-blue-600" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg">{v.isFugitive ? "VEICOLO IN FUGA" : v.licensePlate}</h3>
                      {v.isFugitive && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold">FUGA</span>}
                    </div>
                    <p className="text-sm text-gray-500">
                      {v.vehicleType}{v.directionOfTravel ? ` • Dir. ${v.directionOfTravel}` : ''}{v.maneuver ? ` • ${v.maneuver}` : ''}
                    </p>
                    {v.insuranceCompany && <p className="text-xs text-gray-400">Assicurazione: {v.insuranceCompany} {v.insurancePolicy ? `(${v.insurancePolicy})` : ''}</p>}
                    {v.damageDescription && <p className="text-xs text-gray-400 mt-1">Danni: {v.damageDescription}</p>}
                    {/* Occupants */}
                    {accident.people?.filter((p: any) => p.accidentVehicleId === v.id).length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Occupanti:</p>
                        {accident.people.filter((p: any) => p.accidentVehicleId === v.id).map((p: any) => (
                          <p key={p.id} className="text-xs text-gray-600">
                            {p.role}: {p.firstName} {p.lastName}
                            {p.isFugitive ? ' ⚠ FUGA' : ''}
                            {p.injuries && p.injuries !== 'NESSUNA' ? ` (${p.injuries})` : ''}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB PERSONE */}
        {activeTab === "persone" && (
          <div className="space-y-4">
            {(accident.status !== "CHIUSO") && (
              <button onClick={() => setShowPersonModal(true)}
                className="w-full bg-purple-50 text-purple-700 border border-purple-200 border-dashed py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-purple-100 transition-colors">
                <Users className="w-5 h-5" /> Aggiungi Persona
              </button>
            )}

            {accident.people?.map((p: any) => {
              const vehicle = accident.vehicles?.find((v: any) => v.id === p.accidentVehicleId)
              return (
                <div key={p.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative">
                  {accident.status !== "CHIUSO" && (
                    <button onClick={() => handleDeletePerson(p.id)} className="absolute top-2 right-2 p-1.5 rounded-full bg-gray-100 hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors z-10">
                      <Trash2 size={14} />
                    </button>
                  )}
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-full ${p.isFugitive ? 'bg-red-100' : 'bg-purple-100'}`}>
                      <Users className={`w-6 h-6 ${p.isFugitive ? 'text-red-600' : 'text-purple-600'}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg">
                          {p.isFugitive ? "CONDUCENTE IN FUGA" : `${p.firstName} ${p.lastName}`}
                        </h3>
                        {p.isFugitive && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold">FUGA</span>}
                      </div>
                      <p className="text-sm text-gray-500">
                        {p.role}{p.fiscalCode ? ` • CF: ${p.fiscalCode}` : ''}
                        {vehicle ? ` • Veicolo: ${vehicle.isFugitive ? 'FUGITIVO' : vehicle.licensePlate}` : p.accidentVehicleId ? '' : ' • Pedone/Testimone'}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {p.licenseCategory && <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded">Patente: {p.licenseCategory}</span>}
                        {p.seatbeltUsed !== null && <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded">{p.seatbeltUsed ? '✓ Cintura/Casco' : '✗ No Cintura/Casco'}</span>}
                        {p.injuries && p.injuries !== "NESSUNA" && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">{p.injuries}</span>}
                        {p.alcoholTest && <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded">Alcol: {p.alcoholTest}</span>}
                        {p.drugTest && <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded">Droghe: {p.drugTest}</span>}
                      </div>
                      {p.email && <p className="text-xs text-gray-400 mt-1">Email: {p.email}</p>}
                      {p.injuriesDetail && <p className="text-xs text-gray-400 mt-1">Dettaglio: {p.injuriesDetail}</p>}
                      {p.statement && <p className="text-xs text-gray-500 mt-1 italic">"{p.statement.substring(0, 100)}"</p>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* TAB SICUREZZA */}
        {activeTab === "sicurezza" && (
          <div className="space-y-3">
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <ClipboardCheck size={18} className="text-green-600" /> Checklist Messa in Sicurezza
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: "STRADA_CHIUSA", label: "Strada Chiusa" },
                  { key: "TRAFFICO_DEVIATO", label: "Traffico Deviato" },
                  { key: "VVF_PRESENTI", label: "VVF Presenti" },
                  { key: "118_PRESENTE", label: "118 Presente" },
                  { key: "AREA_SICURA", label: "Area Sicura" },
                  { key: "RISCHIO_INCENDIO", label: "Rischio Incendio" },
                  { key: "RISCHIO_CARBURANTE", label: "Rischio Carburante" },
                  { key: "RISCHIO_ELETTRICO", label: "Rischio Elettrico" },
                ].map(item => {
                  const checked = safetyChecklist.includes(item.key)
                  return (
                    <label key={item.key} className={`flex items-center gap-2 p-2 rounded-lg text-xs font-medium cursor-pointer border transition-colors ${
                      checked ? "bg-green-50 border-green-200 text-green-700" : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"
                    }`}>
                      <input type="checkbox" checked={checked} disabled={accident.status === "CHIUSO"}
                        onChange={e => {
                          const updated = e.target.checked ? [...safetyChecklist, item.key] : safetyChecklist.filter(i => i !== item.key)
                          setSafetyChecklist(updated)
                        }}
                        className="w-3.5 h-3.5 rounded" />
                      {item.label}
                    </label>
                  )
                })}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <h4 className="text-sm font-bold text-gray-700 mb-2">Firma Agente (obbligatoria)</h4>
                <SignaturePad 
                  onSave={(sig) => setSafetySignature(sig)} 
                  onClear={() => setSafetySignature("")} 
                  disabled={accident.status === "CHIUSO"}
                  initialValue={safetySignature}
                />
                {!safetySignature && <p className="text-xs text-red-500 mt-1 font-medium">Attenzione: traccia la firma prima di salvare.</p>}
              </div>

              {accident.status !== "CHIUSO" && (
                <button onClick={handleSaveSecurity}
                  className="w-full mt-4 py-3 bg-green-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md">
                  <Save size={18} />
                  Conferma e Sblocca Workflow
                </button>
              )}
            </div>
          </div>
        )}

        {/* TAB TRACCE */}
        {activeTab === "tracce" && (
          <div className="space-y-3">
            {(accident.status !== "CHIUSO") && (
              <button onClick={() => setShowTraceModal(true)}
                className="w-full bg-amber-50 text-amber-700 border border-amber-200 border-dashed py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-amber-100 transition-colors">
                <Ruler size={18} /> Aggiungi Traccia / Reperto
              </button>
            )}

            {traces.length === 0 ? (
              <div className="text-center p-8 bg-white rounded-xl border border-gray-100">
                <Ruler className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Nessuna traccia catalogata</p>
                <p className="text-[10px] text-gray-300 mt-1">UNI 11472: frenate, abrasioni, detriti, liquidi, vetri</p>
              </div>
            ) : (
              traces.map((t: any) => (
                <div key={t.id} className="bg-white rounded-xl border border-gray-100 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-700">{t.code}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{t.type}</span>
                  </div>
                  {t.position && <p className="text-xs text-gray-500 mt-1">Posizione: {t.position}</p>}
                  {t.measurement && <p className="text-xs text-gray-500">Misura: {t.measurement}</p>}
                  {t.dimensions && <p className="text-xs text-gray-500">Dimensioni: {t.dimensions}</p>}
                  {t.description && <p className="text-xs text-gray-600 mt-1">{t.description}</p>}
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB FOTO */}
        {activeTab === "foto" && (
          <div className="space-y-4">
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-200 text-sm text-orange-800">
              <b>Rilievo Fotografico Forense (UNI 11472)</b>: Acquisendo una foto verrà generato un hash SHA-256 che ne garantirà l'immutabilità. Sono richieste almeno 4 panoramiche.
            </div>

            {accident.status !== "CHIUSO" && (
              <div className="flex gap-2">
                <label className="flex-1 bg-slate-800 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md cursor-pointer hover:bg-slate-700 transition">
                  <Camera className="w-5 h-5" /> Scatta / Allega
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoUpload} disabled={loading} />
                </label>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mt-4">
              {accident.forensicPhotos?.map((p: any, idx: number) => (
                <div key={p.id} className="relative group rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                  {accident.status !== "CHIUSO" && (
                    <button onClick={() => handleDeletePhoto(p.id)} className="absolute top-1 right-1 p-1.5 bg-red-500 text-white rounded-full z-10 hover:bg-red-600 shadow-md">
                      <Trash2 size={12} />
                    </button>
                  )}
                  <img src={p.url} alt={`Foto ${idx+1}`} className="w-full h-32 object-cover" />
                  <div className="p-2 bg-white">
                    <p className="text-[10px] font-bold text-gray-700">{p.category}</p>
                    <p className="text-[8px] text-gray-400 font-mono truncate" title={p.hashSha256}>SHA: {p.hashSha256}</p>
                  </div>
                </div>
              ))}
            </div>
            
            {!accident.forensicPhotos?.length && (
              <div className="text-center p-8 bg-white rounded-xl border border-gray-100">
                <Camera className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Nessuna foto acquisita</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===== VEHICLE MODAL ===== */}
      {showVehicleModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowVehicleModal(false)}>
          <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-5 max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2"><Car size={20} className="text-blue-600" /> Nuovo Veicolo</h2>
              <button onClick={() => setShowVehicleModal(false)} className="p-2 rounded-full bg-gray-100"><X size={18} /></button>
            </div>

            {/* Fugitive toggle */}
            <label className="flex items-center gap-2 mb-4 p-3 bg-red-50 border border-red-200 rounded-xl cursor-pointer">
              <input type="checkbox" checked={vehicleForm.isFugitive} onChange={e => setVehicleForm({...vehicleForm, isFugitive: e.target.checked, licensePlate: e.target.checked ? "FUGITIVO" : ""})} className="w-4 h-4" />
              <AlertTriangle size={16} className="text-red-500" />
              <span className="text-sm font-bold text-red-700">Veicolo in Fuga (dati sconosciuti)</span>
            </label>

            {!vehicleForm.isFugitive && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Targa *</label>
                  <input type="text" value={vehicleForm.licensePlate} onChange={e => setVehicleForm({...vehicleForm, licensePlate: e.target.value})} placeholder="AB123CD" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Telaio/VIN</label>
                    <input type="text" value={vehicleForm.vin} onChange={e => setVehicleForm({...vehicleForm, vin: e.target.value})} placeholder="ZFA..." className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Revisione (scadenza)</label>
                    <input type="text" value={vehicleForm.revisionDate} onChange={e => setVehicleForm({...vehicleForm, revisionDate: e.target.value})} placeholder="MM/AAAA" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Compagnia Assicurativa</label>
                  <input type="text" value={vehicleForm.insuranceCompany} onChange={e => setVehicleForm({...vehicleForm, insuranceCompany: e.target.value})} placeholder="Es. UnipolSai" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Numero Polizza</label>
                  <input type="text" value={vehicleForm.insurancePolicy} onChange={e => setVehicleForm({...vehicleForm, insurancePolicy: e.target.value})} placeholder="Es. 12345678" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900" />
                </div>
              </div>
            )}

            <div className="space-y-3 mt-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Tipo Veicolo</label>
                <select value={vehicleForm.vehicleType} onChange={e => setVehicleForm({...vehicleForm, vehicleType: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900">
                  {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Direzione di Marcia</label>
                  <select value={vehicleForm.directionOfTravel} onChange={e => setVehicleForm({...vehicleForm, directionOfTravel: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900">
                    <option value="">—</option>
                    {DIRECTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Manovra in Atto</label>
                  <select value={vehicleForm.maneuver} onChange={e => setVehicleForm({...vehicleForm, maneuver: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900">
                    <option value="">—</option>
                    {MANEUVERS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Descrizione Danni</label>
                <textarea rows={2} value={vehicleForm.damageDescription} onChange={e => setVehicleForm({...vehicleForm, damageDescription: e.target.value})} placeholder="Danni visibili sul veicolo..." className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900" />
              </div>

              {/* Damage Areas */}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Aree Danneggiate</label>
                <div className="flex flex-wrap gap-2">
                  {DAMAGE_AREAS.map(area => {
                    const active = vehicleForm.damageAreas.includes(area)
                    return (
                      <button key={area} type="button" onClick={() => {
                        const updated = active ? vehicleForm.damageAreas.filter(a => a !== area) : [...vehicleForm.damageAreas, area]
                        setVehicleForm({...vehicleForm, damageAreas: updated})
                      }}
                        className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
                          active ? "bg-red-100 border-red-300 text-red-700" : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"
                        }`}>
                        {area}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Tipo Deformazione</label>
                  <select value={vehicleForm.deformationType} onChange={e => setVehicleForm({...vehicleForm, deformationType: e.target.value})}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900">
                    <option value="">—</option>
                    <option value="LEGGERA">Leggera</option>
                    <option value="MEDIA">Media</option>
                    <option value="GRAVE">Grave</option>
                    <option value="INTRUSIONE_ABITACOLO">Intrusione Abitacolo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Condizione Pneumatici</label>
                  <select value={vehicleForm.tireCondition} onChange={e => setVehicleForm({...vehicleForm, tireCondition: e.target.value})}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900">
                    <option value="">—</option>
                    <option value="BUONO">Buono</option>
                    <option value="USURATO">Usurato</option>
                    <option value="LISCIO">Liscio</option>
                    <option value="SCOPPIATO">Scoppiato</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2">
                <input type="checkbox" checked={vehicleForm.airbagDeployed} onChange={e => setVehicleForm({...vehicleForm, airbagDeployed: e.target.checked})} className="w-4 h-4" />
                <span className="text-sm text-gray-600">Airbag attivati</span>
              </label>
            </div>

            <button onClick={handleSaveVehicle} disabled={savingVehicle}
              className="w-full mt-4 py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all">
              {savingVehicle ? <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div> : <Car size={18} />}
              Salva Veicolo
            </button>
          </div>
        </div>
      )}

      {/* ===== PERSON MODAL ===== */}
      {showPersonModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowPersonModal(false)}>
          <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-5 max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2"><Users size={20} className="text-purple-600" /> Nuova Persona</h2>
              <button onClick={() => setShowPersonModal(false)} className="p-2 rounded-full bg-gray-100"><X size={18} /></button>
            </div>

            {/* Fugitive toggle */}
            <label className="flex items-center gap-2 mb-4 p-3 bg-red-50 border border-red-200 rounded-xl cursor-pointer">
              <input type="checkbox" checked={personForm.isFugitive} onChange={e => setPersonForm({...personForm, isFugitive: e.target.checked, firstName: e.target.checked ? "IGNOTO" : ""})} className="w-4 h-4" />
              <AlertTriangle size={16} className="text-red-500" />
              <span className="text-sm font-bold text-red-700">Conducente in Fuga (dati sconosciuti)</span>
            </label>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Ruolo</label>
                <select value={personForm.role} onChange={e => setPersonForm({...personForm, role: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900">
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              {!personForm.isFugitive && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Nome *</label>
                    <input type="text" value={personForm.firstName} onChange={e => setPersonForm({...personForm, firstName: e.target.value})} placeholder="Mario" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Cognome *</label>
                    <input type="text" value={personForm.lastName} onChange={e => setPersonForm({...personForm, lastName: e.target.value})} placeholder="Rossi" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900" />
                  </div>
                </div>
              )}

              {!personForm.isFugitive && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Codice Fiscale</label>
                    <input type="text" value={personForm.fiscalCode} onChange={e => setPersonForm({...personForm, fiscalCode: e.target.value})} placeholder="RSSMRA80A01H501K" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Patente</label>
                    <select value={personForm.licenseCategory} onChange={e => setPersonForm({...personForm, licenseCategory: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900">
                      <option value="">—</option>
                      {LICENSE_CATEGORIES.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {(personForm.role === "CONDUCENTE" || personForm.role === "PASSEGGERO") && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Abbina a Veicolo</label>
                  <select value={personForm.vehicleIndex ?? -1} onChange={e => setPersonForm({...personForm, vehicleIndex: parseInt(e.target.value)})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900">
                    <option value={-1}>Nessuno (pedone/testimone / fuga)</option>
                    {accident.vehicles?.map((v: any, idx: number) => (
                      <option key={v.id} value={idx}>{v.isFugitive ? 'Veicolo in FUGA' : v.licensePlate} ({v.vehicleType})</option>
                    ))}
                  </select>
                </div>
              )}

              {(personForm.role === "CONDUCENTE" || personForm.role === "PASSEGGERO") && (
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={personForm.seatbeltUsed} onChange={e => setPersonForm({...personForm, seatbeltUsed: e.target.checked})} className="w-4 h-4" />
                  <span className="text-sm text-gray-600">Cintura di sicurezza / Casco indossato</span>
                </label>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Lesioni</label>
                  <select value={personForm.injuries} onChange={e => setPersonForm({...personForm, injuries: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900">
                    <option value="">Seleziona</option>
                    {INJURIES.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Test Alcol</label>
                  <select value={personForm.alcoholTest} onChange={e => setPersonForm({...personForm, alcoholTest: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900">
                    <option value="">—</option>
                    <option value="NEGATIVO">Negativo</option>
                    <option value="POSITIVO">Positivo</option>
                    <option value="RIFIUTATO">Rifiutato</option>
                    <option value="NON EFFETTUATO">Non Effettuato</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Dettaglio Lesioni</label>
                <textarea rows={2} value={personForm.injuriesDetail} onChange={e => setPersonForm({...personForm, injuriesDetail: e.target.value})} placeholder="Descrizione dettagliata delle lesioni riportate..." className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900" />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Documento (tipo/n.)</label>
                <input type="text" value={personForm.documentType} onChange={e => setPersonForm({...personForm, documentType: e.target.value})} placeholder="Es. CI AB1234567" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Telefono Contatto</label>
                <input type="text" value={personForm.contactPhone} onChange={e => setPersonForm({...personForm, contactPhone: e.target.value})} placeholder="+39 ..." className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Email</label>
                <input type="email" value={personForm.email} onChange={e => setPersonForm({...personForm, email: e.target.value})} placeholder="email@esempio.it" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Dichiarazione / Testimonianza</label>
                <textarea rows={2} value={personForm.statement} onChange={e => setPersonForm({...personForm, statement: e.target.value})} placeholder="Dichiarazione resa sul posto..." className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900" />
              </div>
            </div>

            <button onClick={handleSavePerson} disabled={savingPerson}
              className="w-full mt-4 py-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all">
              {savingPerson ? <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div> : <Users size={18} />}
              Salva Persona
            </button>
          </div>
        </div>
      )}

      {/* ===== TRACE MODAL ===== */}
      {showTraceModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowTraceModal(false)}>
          <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-5 max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2"><Ruler size={20} className="text-amber-600" /> Nuova Traccia</h2>
              <button onClick={() => setShowTraceModal(false)} className="p-2 rounded-full bg-gray-100"><X size={18} /></button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Codice *</label>
                  <input type="text" value={traceForm.code} onChange={e => setTraceForm({...traceForm, code: e.target.value})}
                    placeholder="Es. TR-001" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Tipo *</label>
                  <select value={traceForm.type} onChange={e => setTraceForm({...traceForm, type: e.target.value})}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900">
                    <option value="">Seleziona</option>
                    {TRACE_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Posizione</label>
                  <input type="text" value={traceForm.position} onChange={e => setTraceForm({...traceForm, position: e.target.value})}
                    placeholder="Es. 2m da palo luce" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Misura (es. 14.3m)</label>
                  <input type="text" value={traceForm.measurement} onChange={e => setTraceForm({...traceForm, measurement: e.target.value})}
                    placeholder="Es. 14.3" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Dimensioni (es. 2.5m x 0.3m)</label>
                <input type="text" value={traceForm.dimensions} onChange={e => setTraceForm({...traceForm, dimensions: e.target.value})}
                  placeholder="Es. 2.5m x 0.3m" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Descrizione</label>
                <textarea rows={2} value={traceForm.description} onChange={e => setTraceForm({...traceForm, description: e.target.value})}
                  placeholder="Descrizione dettagliata del reperto..." className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900" />
              </div>
            </div>

            <button onClick={handleSaveTrace} disabled={savingTrace}
              className="w-full mt-4 py-4 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all">
              {savingTrace ? <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div> : <Ruler size={18} />}
              Cataloga Traccia
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
