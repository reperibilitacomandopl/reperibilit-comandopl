"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Car, Users, Camera, Info, CheckCircle, Upload, X, AlertTriangle, ShieldAlert, Ruler, ClipboardCheck, Plus, Trash2, FileText, Save, MessageSquareText, MapPin, Building2, Mail, Pencil, Home, Download, FileDown } from "lucide-react"
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
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null)
  const [vehicleForm, setVehicleForm] = useState({
    licensePlate: "", vehicleType: "Autovettura", vin: "", directionOfTravel: "", maneuver: "",
    isFugitive: false, insuranceCompany: "", insurancePolicy: "", revisionDate: "",
    damageDescription: "", damageAreas: [] as string[], deformationType: "", airbagDeployed: false, tireCondition: "",
  })
  const [savingVehicle, setSavingVehicle] = useState(false)

  // Person modal
  const [showPersonModal, setShowPersonModal] = useState(false)
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null)
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

  // Declarations
  const [declarations, setDeclarations] = useState<any[]>([])
  const [showDeclarationModal, setShowDeclarationModal] = useState(false)
  const [declarationForm, setDeclarationForm] = useState({
    personId: "", type: "SPONTANEA", content: "",
    signedByPerson: false, legalWarningGiven: false, refused: false,
  })
  const [savingDeclaration, setSavingDeclaration] = useState(false)

  // Survey
  const [surveys, setSurveys] = useState<any[]>([])
  const [showSurveyModal, setShowSurveyModal] = useState(false)
  const [surveyForm, setSurveyForm] = useState({
    roadType: "", roadName: "", roadWidth: "", laneCount: "", speedLimit: "",
    slopeType: "", slopePercent: "", impactZoneDesc: "",
    impactMeasures: [] as { label: string; value: string; unit: string; fromReference: string }[],
    skidMarksLength: "", debrisDescription: "",
    signagePresent: [] as string[], signageDamaged: false,
    roadMarkingsPresent: false, trafficLightPresent: false, trafficLightWorking: false,
    guardRailDamaged: false, publicLightingDamaged: false, otherDamages: "",
  })
  const [savingSurvey, setSavingSurvey] = useState(false)

  // External Units
  const [externalUnits, setExternalUnits] = useState<any[]>([])
  const [showUnitModal, setShowUnitModal] = useState(false)
  const [unitForm, setUnitForm] = useState({
    unitType: "VVF", unitName: "", unitIdentifier: "", arrivedAt: "", leftAt: "",
    officerInCharge: "", actionsPerformed: "", reportNumber: "", notes: "",
  })
  const [savingUnit, setSavingUnit] = useState(false)

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

  useEffect(() => { fetchAccident(); fetchTraces(); fetchDeclarations(); fetchSurveys(); fetchExternalUnits() }, [accidentId])

  const fetchTraces = async () => {
    try {
      const res = await fetch(`/api/agent/accidents/${accidentId}/traces`)
      if (res.ok) setTraces(await res.json())
    } catch {}
  }

  const fetchDeclarations = async () => {
    try {
      const res = await fetch(`/api/agent/accidents/${accidentId}/declarations`)
      if (res.ok) setDeclarations(await res.json())
    } catch {}
  }

  const fetchSurveys = async () => {
    try {
      const res = await fetch(`/api/agent/accidents/${accidentId}/survey`)
      if (res.ok) setSurveys(await res.json())
    } catch {}
  }

  const fetchExternalUnits = async () => {
    try {
      const res = await fetch(`/api/agent/accidents/${accidentId}/external-units`)
      if (res.ok) setExternalUnits(await res.json())
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

  // --- Vehicle save (create or update) ---
  const openEditVehicle = (v: any) => {
    setEditingVehicleId(v.id)
    setVehicleForm({
      licensePlate: v.licensePlate || "",
      vehicleType: v.vehicleType || "Autovettura",
      vin: v.vin || "",
      directionOfTravel: v.directionOfTravel || "",
      maneuver: v.maneuver || "",
      isFugitive: v.isFugitive || false,
      insuranceCompany: v.insuranceCompany || "",
      insurancePolicy: v.insurancePolicy || "",
      revisionDate: v.revisionDate || "",
      damageDescription: v.damageDescription || "",
      damageAreas: v.damageAreas || [],
      deformationType: v.deformationType || "",
      airbagDeployed: v.airbagDeployed || false,
      tireCondition: v.tireCondition || "",
    })
    setShowVehicleModal(true)
  }

  const handleSaveVehicle = async () => {
    if (!vehicleForm.licensePlate.trim() && !vehicleForm.isFugitive) {
      toast.error("Inserire targa o selezionare Veicolo in Fuga"); return
    }
    setSavingVehicle(true)
    try {
      const method = editingVehicleId ? "PUT" : "POST"
      const url = editingVehicleId
        ? `/api/agent/accidents/${accidentId}/vehicles?vehicleId=${editingVehicleId}`
        : `/api/agent/accidents/${accidentId}/vehicles`
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...vehicleForm,
          licensePlate: vehicleForm.isFugitive ? "FUGITIVO" : vehicleForm.licensePlate,
        }),
      })
      if (res.ok) {
        toast.success(editingVehicleId ? "Veicolo aggiornato" : "Veicolo aggiunto")
        setShowVehicleModal(false)
        setEditingVehicleId(null)
        setVehicleForm({ licensePlate: "", vehicleType: "Autovettura", vin: "", directionOfTravel: "", maneuver: "", isFugitive: false, insuranceCompany: "", insurancePolicy: "", revisionDate: "", damageDescription: "", damageAreas: [], deformationType: "", airbagDeployed: false, tireCondition: "" })
        fetchAccident()
      } else toast.error((await res.json()).error || "Errore")
    } catch { toast.error("Errore di rete") }
    finally { setSavingVehicle(false) }
  }

  // --- Person save (create or update) ---
  const openEditPerson = (p: any) => {
    const vehicleIndex = accident?.vehicles?.findIndex((v: any) => v.id === p.accidentVehicleId) ?? -1
    setEditingPersonId(p.id)
    setPersonForm({
      role: p.role || "CONDUCENTE",
      firstName: p.firstName || "",
      lastName: p.lastName || "",
      fiscalCode: p.fiscalCode || "",
      documentType: p.documentType || "",
      licenseCategory: p.licenseCategory || "",
      seatbeltUsed: p.seatbeltUsed || false,
      isFugitive: p.isFugitive || false,
      injuries: p.injuries || "",
      injuriesDetail: p.injuriesDetail || "",
      alcoholTest: p.alcoholTest || "",
      drugTest: p.drugTest || "",
      statement: p.statement || "",
      contactPhone: p.contactPhone || "",
      email: p.email || "",
      vehicleIndex,
    })
    setShowPersonModal(true)
  }

  const handleSavePerson = async () => {
    if (!personForm.firstName.trim() && !personForm.isFugitive) {
      toast.error("Inserire nome o selezionare Fuga"); return
    }
    setSavingPerson(true)
    try {
      const method = editingPersonId ? "PUT" : "POST"
      const url = editingPersonId
        ? `/api/agent/accidents/${accidentId}/people?personId=${editingPersonId}`
        : `/api/agent/accidents/${accidentId}/people`
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify(personForm),
      })
      if (res.ok) {
        toast.success(editingPersonId ? "Persona aggiornata" : "Persona aggiunta")
        setShowPersonModal(false)
        setEditingPersonId(null)
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

  // --- Declaration save ---
  const handleSaveDeclaration = async () => {
    if (!declarationForm.personId || !declarationForm.content.trim()) { toast.error("Persona e contenuto obbligatori"); return }
    if (declarationForm.type === "S.I.T." && !declarationForm.legalWarningGiven) { toast.error("S.I.T. richiede ammonizione art. 64 C.p.p."); return }
    setSavingDeclaration(true)
    try {
      const res = await fetch(`/api/agent/accidents/${accidentId}/declarations`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(declarationForm),
      })
      if (res.ok) {
        toast.success("Dichiarazione registrata")
        setShowDeclarationModal(false)
        setDeclarationForm({ personId: "", type: "SPONTANEA", content: "", signedByPerson: false, legalWarningGiven: false, refused: false })
        fetchDeclarations()
      } else toast.error((await res.json()).error || "Errore")
    } catch { toast.error("Errore di rete") }
    finally { setSavingDeclaration(false) }
  }

  // --- Survey save ---
  const handleSaveSurvey = async () => {
    setSavingSurvey(true)
    try {
      const payload = {
        ...surveyForm,
        roadWidth: surveyForm.roadWidth ? parseFloat(surveyForm.roadWidth) : undefined,
        laneCount: surveyForm.laneCount ? parseInt(surveyForm.laneCount) : undefined,
        speedLimit: surveyForm.speedLimit ? parseInt(surveyForm.speedLimit) : undefined,
        slopePercent: surveyForm.slopePercent ? parseFloat(surveyForm.slopePercent) : undefined,
        skidMarksLength: surveyForm.skidMarksLength ? parseFloat(surveyForm.skidMarksLength) : undefined,
      }
      const res = await fetch(`/api/agent/accidents/${accidentId}/survey`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        toast.success("Rilievi salvati")
        setShowSurveyModal(false)
        setSurveyForm({ roadType: "", roadName: "", roadWidth: "", laneCount: "", speedLimit: "", slopeType: "", slopePercent: "", impactZoneDesc: "", impactMeasures: [], skidMarksLength: "", debrisDescription: "", signagePresent: [], signageDamaged: false, roadMarkingsPresent: false, trafficLightPresent: false, trafficLightWorking: false, guardRailDamaged: false, publicLightingDamaged: false, otherDamages: "" })
        fetchSurveys()
      } else toast.error((await res.json()).error || "Errore")
    } catch { toast.error("Errore di rete") }
    finally { setSavingSurvey(false) }
  }

  // --- External Unit save ---
  const handleSaveUnit = async () => {
    setSavingUnit(true)
    try {
      const payload = { ...unitForm, arrivedAt: unitForm.arrivedAt ? new Date(unitForm.arrivedAt).toISOString() : undefined, leftAt: unitForm.leftAt ? new Date(unitForm.leftAt).toISOString() : undefined }
      const res = await fetch(`/api/agent/accidents/${accidentId}/external-units`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        toast.success("Ente esterno aggiunto")
        setShowUnitModal(false)
        setUnitForm({ unitType: "VVF", unitName: "", unitIdentifier: "", arrivedAt: "", leftAt: "", officerInCharge: "", actionsPerformed: "", reportNumber: "", notes: "" })
        fetchExternalUnits()
      } else toast.error((await res.json()).error || "Errore")
    } catch { toast.error("Errore di rete") }
    finally { setSavingUnit(false) }
  }

  // --- Narrative ---
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

  const compressImage = (file: File, maxW = 1920, maxH = 1080, quality = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        let { width, height } = img
        if (width > maxW) { height = height * (maxW / width); width = maxW }
        if (height > maxH) { width = width * (maxH / height); height = maxH }
        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        if (!ctx) { reject(new Error("Canvas context failed")); return }
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL("image/jpeg", quality))
      }
      img.onerror = () => reject(new Error("Image load failed"))
      img.src = URL.createObjectURL(file)
    })
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    try {
      // Compress image to JPEG before hashing and uploading
      const compressedUrl = await compressImage(file)

      // Hash the compressed version
      const compressedBytes = await fetch(compressedUrl).then(r => r.arrayBuffer())
      const hashBuffer = await crypto.subtle.digest('SHA-256', compressedBytes)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

      const res = await fetch(`/api/agent/accidents/${accidentId}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: compressedUrl,
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
        const err = await res.json().catch(() => ({}))
        toast.error((err as any).error || "Errore salvataggio foto")
        setLoading(false)
      }
      URL.revokeObjectURL(compressedUrl)
    } catch (error) {
      toast.error("Errore durante il caricamento della foto")
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

  const sevLabels = new Map(Object.entries({ SOLO_DANNI: "Danni a Cose", FERITI: "Con Feriti", MORTALE: "Mortale", RISERVA_PROGNOSI: "Prognosi Riservata" }))
  const statusLabels = new Map(Object.entries({ BOZZA: "Bozza", IN_COMPILAZIONE: "In Compilazione", REVISIONATO: "Revisionato", CHIUSO: "Chiuso" }))

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="bg-slate-800 text-white p-4 sticky top-0 z-10 shadow-md">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push(`/${params.tenantSlug}/agent/sinistri`)} className="p-2 bg-slate-700 rounded-full" title="Torna alla lista">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button onClick={() => router.push(`/${params.tenantSlug}/agent`)} className="p-2 bg-slate-700 rounded-full" title="Home Agente">
            <Home className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold">{accident.protocolNumber || "Bozza Sinistro"}</h1>
            <p className="text-xs text-slate-300 truncate max-w-[250px]">{accident.address}</p>
          </div>
          <div className="ml-auto flex gap-1">
            <button onClick={() => window.open(`/api/agent/accidents/${accidentId}/pdf`, "_blank")}
              className="p-2 bg-green-600 hover:bg-green-500 rounded-full transition-colors" title="Scarica PDF">
              <Download className="w-5 h-5" />
            </button>
            <button onClick={() => window.open(`/api/agent/accidents/${accidentId}/docx`, "_blank")}
              className="p-2 bg-blue-600 hover:bg-blue-500 rounded-full transition-colors" title="Scarica DOCX (Word)">
              <FileDown className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex justify-between mt-6 text-sm font-medium overflow-x-auto gap-3 pb-2 px-1 scrollbar-hide">
          {[
            { id: "info", label: "1. Info", done: true },
            { id: "sicurezza", label: "2. Sicurezza", done: accident.safetyChecklist?.length > 0 && !!accident.safetySignature },
            { id: "tracce", label: "3. Tracce", done: traces.length > 0 },
            { id: "foto", label: "4. Foto", done: accident.photos?.length >= 4 },
            { id: "veicoli", label: `5. Veicoli (${accident.vehicles?.length || 0})`, done: accident.vehicles?.length > 0 },
            { id: "persone", label: `6. Persone (${accident.people?.length || 0})`, done: accident.people?.length > 0 },
            { id: "dichiarazioni", label: `7. Dich. (${declarations.length})`, done: declarations.length > 0 },
            { id: "rilievi", label: `8. Rilievi (${surveys.length})`, done: surveys.length > 0 },
            { id: "enti", label: `9. Enti (${externalUnits.length})`, done: externalUnits.length > 0 },
            { id: "relazione", label: "10. Relazione", done: !!narrative }
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
                <p><b>Gravità:</b> {sevLabels.get(accident.severity) || accident.severity}</p>
                <p><b>Tipo Strada:</b> {accident.roadType || "n/d"}</p>
                <p><b>Illuminazione:</b> {accident.lighting || "n/d"}</p>
                <p><b>Meteo:</b> {accident.weatherCondition || "n/d"}</p>
                <p><b>Fondo:</b> {accident.roadCondition || "n/d"}</p>
                <p><b>Traffico:</b> {accident.trafficCondition || "n/d"}</p>
                <p><b>Stato:</b> {statusLabels.get(accident.status) || accident.status}</p>
              </div>
              {accident.dynamicDescription && (
                <div className="mt-3 pt-3 border-t">
                  <b className="text-xs text-gray-500 uppercase">Dinamica:</b>
                  <p className="text-sm mt-1">{accident.dynamicDescription}</p>
                </div>
              )}
            </div>

            {/* Fascicolo separato + Invio */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Mail className="w-5 h-5 text-indigo-500" /> Fascicolo e Invio
              </h3>

              <label className="flex items-center gap-2 mb-3 p-3 bg-indigo-50 border border-indigo-200 rounded-xl cursor-pointer">
                <input type="checkbox" checked={accident.separateFascicolo || false}
                  onChange={async () => {
                    try {
                      const res = await fetch(`/api/agent/accidents/${accidentId}`, {
                        method: "PUT", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ separateFascicolo: !accident.separateFascicolo }),
                      })
                      if (res.ok) fetchAccident()
                    } catch {}
                  }}
                  className="w-4 h-4" />
                <span className="text-sm font-bold text-indigo-700">Crea fascicolo separato</span>
              </label>

              {accident.status !== "BOZZA" && (
                <button
                  onClick={async () => {
                    const recipients = accident.people
                      ?.filter((p: any) => p.email)
                      .map((p: any) => ({
                        email: p.email,
                        recipientType: p.role === "CONDUCENTE" ? "CONDUCENTE" : "PROPRIETARIO",
                        name: `${p.firstName} ${p.lastName}`
                      })) || []
                    if (recipients.length === 0) {
                      toast.error("Nessuna email disponibile tra le persone coinvolte")
                      return
                    }
                    if (!confirm(`Inviare il fascicolo a ${recipients.length} destinatari?`)) return
                    try {
                      const res = await fetch(`/api/agent/accidents/${accidentId}/send-email`, {
                        method: "POST", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ recipients, subject: `Fascicolo Sinistro ${accident.protocolNumber}` }),
                      })
                      if (res.ok) toast.success("Fascicolo inviato!")
                      else toast.error((await res.json()).error || "Errore invio")
                    } catch { toast.error("Errore di rete") }
                  }}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all">
                  <Mail size={16} /> Invia Fascicolo alle Parti
                </button>
              )}
              {accident.status === "BOZZA" && (
                <p className="text-xs text-gray-400 text-center">L'invio è disponibile dopo l'invio in revisione</p>
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
              <button onClick={() => { setEditingVehicleId(null); setVehicleForm({ licensePlate: "", vehicleType: "Autovettura", vin: "", directionOfTravel: "", maneuver: "", isFugitive: false, insuranceCompany: "", insurancePolicy: "", revisionDate: "", damageDescription: "", damageAreas: [], deformationType: "", airbagDeployed: false, tireCondition: "" }); setShowVehicleModal(true) }}
                className="w-full bg-blue-50 text-blue-700 border border-blue-200 border-dashed py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-100 transition-colors">
                <Car className="w-5 h-5" /> Aggiungi Veicolo
              </button>
            )}

            {accident.vehicles?.map((v: any, idx: number) => (
              <div key={v.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative">
                <div className="absolute top-2 right-2 flex gap-1 z-10">
                  <button onClick={() => window.open(`/api/agent/accidents/${accidentId}/pdf?entity=vehicle&entityId=${v.id}`, "_blank")} className="p-1.5 rounded-full bg-gray-100 hover:bg-green-100 text-gray-400 hover:text-green-500 transition-colors" title="Scarica scheda veicolo">
                    <Download size={14} />
                  </button>
                  {accident.status !== "CHIUSO" && (<>
                    <button onClick={() => openEditVehicle(v)} className="p-1.5 rounded-full bg-gray-100 hover:bg-blue-100 text-gray-400 hover:text-blue-500 transition-colors" title="Modifica veicolo">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDeleteVehicle(v.id)} className="p-1.5 rounded-full bg-gray-100 hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors" title="Elimina veicolo">
                      <Trash2 size={14} />
                    </button>
                  </>)}
                </div>
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
              <button onClick={() => { setEditingPersonId(null); setPersonForm({ role: "CONDUCENTE", firstName: "", lastName: "", fiscalCode: "", documentType: "", licenseCategory: "", seatbeltUsed: false, isFugitive: false, injuries: "", injuriesDetail: "", alcoholTest: "", drugTest: "", statement: "", contactPhone: "", email: "", vehicleIndex: null }); setShowPersonModal(true) }}
                className="w-full bg-purple-50 text-purple-700 border border-purple-200 border-dashed py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-purple-100 transition-colors">
                <Users className="w-5 h-5" /> Aggiungi Persona
              </button>
            )}

            {accident.people?.map((p: any) => {
              const vehicle = accident.vehicles?.find((v: any) => v.id === p.accidentVehicleId)
              return (
                <div key={p.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative">
                  <div className="absolute top-2 right-2 flex gap-1 z-10">
                    <button onClick={() => window.open(`/api/agent/accidents/${accidentId}/pdf?entity=person&entityId=${p.id}`, "_blank")} className="p-1.5 rounded-full bg-gray-100 hover:bg-green-100 text-gray-400 hover:text-green-500 transition-colors" title="Scheda persona PDF">
                      <Download size={14} />
                    </button>
                    <button onClick={() => window.open(`/api/agent/accidents/${accidentId}/docx-declaration?personId=${p.id}`, "_blank")} className="p-1.5 rounded-full bg-gray-100 hover:bg-blue-100 text-gray-400 hover:text-blue-500 transition-colors" title="Dichiarazioni DOCX (Word)">
                      <FileDown size={14} />
                    </button>
                    {accident.status !== "CHIUSO" && (<>
                      <button onClick={() => openEditPerson(p)} className="p-1.5 rounded-full bg-gray-100 hover:bg-purple-100 text-gray-400 hover:text-purple-500 transition-colors" title="Modifica persona">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDeletePerson(p.id)} className="p-1.5 rounded-full bg-gray-100 hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors" title="Elimina persona">
                        <Trash2 size={14} />
                      </button>
                    </>)}
                  </div>
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

      {/* TAB DICHIARAZIONI */}
        {activeTab === "dichiarazioni" && (
          <div className="space-y-4">
            {(accident.status !== "CHIUSO") && (
              <button onClick={() => setShowDeclarationModal(true)}
                className="w-full bg-sky-50 text-sky-700 border border-sky-200 border-dashed py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-sky-100 transition-colors">
                <MessageSquareText size={18} /> Aggiungi Dichiarazione
              </button>
            )}

            {declarations.length === 0 ? (
              <div className="text-center p-8 bg-white rounded-xl border border-gray-100">
                <MessageSquareText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Nessuna dichiarazione registrata</p>
              </div>
            ) : (
              declarations.map((d: any) => (
                <div key={d.id} className="bg-white rounded-xl border border-gray-100 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-sky-700">{d.type}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                      {d.legalWarningGiven ? "Ammonizione resa" : "No avviso"}
                    </span>
                  </div>
                  <p className="text-sm font-semibold">{d.person?.firstName} {d.person?.lastName} <span className="text-xs text-gray-400">({d.person?.role})</span></p>
                  <p className="text-xs text-gray-600 mt-1 italic line-clamp-3">"{d.content}"</p>
                  <div className="flex gap-2 mt-2 text-[10px] text-gray-400">
                    <span>{d.signedByPerson ? "Firmata" : d.refused ? "Rifiutata" : "Non firmata"}</span>
                    <span>| Agente: {d.recordedBy?.name}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB RILIEVI */}
        {activeTab === "rilievi" && (
          <div className="space-y-4">
            {(accident.status !== "CHIUSO") && (
              <button onClick={() => setShowSurveyModal(true)}
                className="w-full bg-teal-50 text-teal-700 border border-teal-200 border-dashed py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-teal-100 transition-colors">
                <MapPin size={18} /> Aggiungi Rilievi Tecnici
              </button>
            )}

            {surveys.length === 0 ? (
              <div className="text-center p-8 bg-white rounded-xl border border-gray-100">
                <MapPin className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Nessun rilievo tecnico registrato</p>
                <p className="text-[10px] text-gray-300 mt-1">Misure, geometria stradale, segnaletica</p>
              </div>
            ) : (
              surveys.map((s: any) => (
                <div key={s.id} className="bg-white rounded-xl border border-gray-100 p-4">
                  <h4 className="font-bold text-sm text-teal-700 mb-2">Rilievo del {new Date(s.surveyedAt).toLocaleString("it-IT")}</h4>
                  <div className="grid grid-cols-2 gap-y-1 text-xs text-gray-600">
                    {s.roadType && <p>Tipo strada: {s.roadType}</p>}
                    {s.roadName && <p>Nome: {s.roadName}</p>}
                    {s.roadWidth && <p>Larghezza: {s.roadWidth}m</p>}
                    {s.laneCount && <p>Corsie: {s.laneCount}</p>}
                    {s.speedLimit && <p>Limite: {s.speedLimit} km/h</p>}
                    {s.slopeType && <p>Pendenza: {s.slopeType}</p>}
                    {s.skidMarksLength && <p>Frenata: {s.skidMarksLength}m</p>}
                  </div>
                  {s.impactZoneDesc && <p className="text-xs text-gray-600 mt-2">Zona impatto: {s.impactZoneDesc}</p>}
                  {s.signagePresent?.length > 0 && <p className="text-xs text-gray-500 mt-1">Segnaletica: {s.signagePresent.join(", ")}</p>}
                  {s.otherDamages && <p className="text-xs text-red-500 mt-1">Danni: {s.otherDamages}</p>}
                  <p className="text-[10px] text-gray-400 mt-2">Agente rilevatore: {s.surveyedBy?.name}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB ENTI ESTERNI */}
        {activeTab === "enti" && (
          <div className="space-y-4">
            {(accident.status !== "CHIUSO") && (
              <button onClick={() => setShowUnitModal(true)}
                className="w-full bg-indigo-50 text-indigo-700 border border-indigo-200 border-dashed py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-100 transition-colors">
                <Building2 size={18} /> Aggiungi Ente Intervenuto
              </button>
            )}

            {externalUnits.length === 0 ? (
              <div className="text-center p-8 bg-white rounded-xl border border-gray-100">
                <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Nessun ente esterno registrato</p>
                <p className="text-[10px] text-gray-300 mt-1">VVF, 118, Polizia di Stato, Carabinieri, ANAS...</p>
              </div>
            ) : (
              externalUnits.map((u: any) => (
                <div key={u.id} className="bg-white rounded-xl border border-gray-100 p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-indigo-100">
                      <Building2 className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-sm">{u.unitType} {u.unitName ? `— ${u.unitName}` : ""}</h4>
                      {u.unitIdentifier && <p className="text-xs text-gray-500">ID: {u.unitIdentifier}</p>}
                      <div className="flex gap-3 text-[10px] text-gray-400 mt-1">
                        {u.arrivedAt && <span>Arrivo: {new Date(u.arrivedAt).toLocaleTimeString("it-IT")}</span>}
                        {u.leftAt && <span>Partenza: {new Date(u.leftAt).toLocaleTimeString("it-IT")}</span>}
                      </div>
                      {u.actionsPerformed && <p className="text-xs text-gray-600 mt-1">{u.actionsPerformed}</p>}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      {/* ===== VEHICLE MODAL ===== */}
      {showVehicleModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowVehicleModal(false)}>
          <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-5 max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2"><Car size={20} className="text-blue-600" /> {editingVehicleId ? "Modifica Veicolo" : "Nuovo Veicolo"}</h2>
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
              {editingVehicleId ? "Aggiorna Veicolo" : "Salva Veicolo"}
            </button>
          </div>
        </div>
      )}

      {/* ===== PERSON MODAL ===== */}
      {showPersonModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowPersonModal(false)}>
          <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-5 max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2"><Users size={20} className="text-purple-600" /> {editingPersonId ? "Modifica Persona" : "Nuova Persona"}</h2>
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
              {editingPersonId ? "Aggiorna Persona" : "Salva Persona"}
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

      {/* ===== DECLARATION MODAL ===== */}
      {showDeclarationModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowDeclarationModal(false)}>
          <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-5 max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2"><MessageSquareText size={20} className="text-sky-600" /> Nuova Dichiarazione</h2>
              <button onClick={() => setShowDeclarationModal(false)} className="p-2 rounded-full bg-gray-100"><X size={18} /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Persona</label>
                <select value={declarationForm.personId} onChange={e => setDeclarationForm({...declarationForm, personId: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900">
                  <option value="">Seleziona persona</option>
                  {accident.people?.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.firstName} {p.lastName} ({p.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Tipo</label>
                <select value={declarationForm.type} onChange={e => setDeclarationForm({...declarationForm, type: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900">
                  <option value="SPONTANEA">Spontanea</option>
                  <option value="SU_INVITO">Su Invito (L.689/81)</option>
                  <option value="S.I.T.">S.I.T. (art. 351 C.p.p.)</option>
                  <option value="RIFIUTO">Rifiuto a dichiarare</option>
                </select>
              </div>

              {declarationForm.type === "S.I.T." && (
                <label className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl cursor-pointer">
                  <input type="checkbox" checked={declarationForm.legalWarningGiven} onChange={e => setDeclarationForm({...declarationForm, legalWarningGiven: e.target.checked})} className="w-4 h-4" />
                  <span className="text-sm font-bold text-red-700">Ammonizione art. 64 C.p.p. resa</span>
                </label>
              )}

              {(declarationForm.type === "SU_INVITO" || declarationForm.type === "SPONTANEA") && (
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={declarationForm.refused} onChange={e => setDeclarationForm({...declarationForm, refused: e.target.checked})} className="w-4 h-4" />
                  <span className="text-sm text-gray-600">Il soggetto rifiuta di dichiarare</span>
                </label>
              )}

              {!declarationForm.refused && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Dichiarazione *</label>
                  <textarea rows={5} value={declarationForm.content} onChange={e => setDeclarationForm({...declarationForm, content: e.target.value})} placeholder="Testo integrale della dichiarazione..." className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900" />
                </div>
              )}

              <label className="flex items-center gap-2">
                <input type="checkbox" checked={declarationForm.signedByPerson} onChange={e => setDeclarationForm({...declarationForm, signedByPerson: e.target.checked})} className="w-4 h-4" />
                <span className="text-sm text-gray-600">Firmata dall'interessato</span>
              </label>
            </div>

            <button onClick={handleSaveDeclaration} disabled={savingDeclaration}
              className="w-full mt-4 py-4 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all">
              {savingDeclaration ? <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div> : <MessageSquareText size={18} />}
              Registra Dichiarazione
            </button>
          </div>
        </div>
      )}

      {/* ===== SURVEY MODAL ===== */}
      {showSurveyModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowSurveyModal(false)}>
          <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-5 max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2"><MapPin size={20} className="text-teal-600" /> Rilievi Tecnici</h2>
              <button onClick={() => setShowSurveyModal(false)} className="p-2 rounded-full bg-gray-100"><X size={18} /></button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Tipo Strada</label>
                  <select value={surveyForm.roadType} onChange={e => setSurveyForm({...surveyForm, roadType: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900">
                    <option value="">—</option><option value="URBANA">Urbana</option><option value="EXTRAURBANA">Extraurbana</option><option value="AUTOSTRADA">Autostrada</option><option value="PISTA_CICLABILE">Pista Ciclabile</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Nome Strada</label>
                  <input type="text" value={surveyForm.roadName} onChange={e => setSurveyForm({...surveyForm, roadName: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Larghezza (m)</label>
                  <input type="number" step="0.1" value={surveyForm.roadWidth} onChange={e => setSurveyForm({...surveyForm, roadWidth: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Corsie</label>
                  <input type="number" value={surveyForm.laneCount} onChange={e => setSurveyForm({...surveyForm, laneCount: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Limite (km/h)</label>
                  <input type="number" value={surveyForm.speedLimit} onChange={e => setSurveyForm({...surveyForm, speedLimit: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Pendenza</label>
                  <select value={surveyForm.slopeType} onChange={e => setSurveyForm({...surveyForm, slopeType: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900">
                    <option value="">—</option><option value="PIANO">Piano</option><option value="SALITA">Salita</option><option value="DISCESA">Discesa</option><option value="CURVA">Curva</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Percentuale (%)</label>
                  <input type="number" step="0.1" value={surveyForm.slopePercent} onChange={e => setSurveyForm({...surveyForm, slopePercent: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Zona d'Impatto</label>
                <input type="text" value={surveyForm.impactZoneDesc} onChange={e => setSurveyForm({...surveyForm, impactZoneDesc: e.target.value})} placeholder="Es. Incrocio via Roma / via Milano" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Tracce Frenata (m)</label>
                <input type="number" step="0.1" value={surveyForm.skidMarksLength} onChange={e => setSurveyForm({...surveyForm, skidMarksLength: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Detriti/Frammenti</label>
                <input type="text" value={surveyForm.debrisDescription} onChange={e => setSurveyForm({...surveyForm, debrisDescription: e.target.value})} placeholder="Vetri, plastiche, liquidi..." className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900" />
              </div>

              {/* Impact Measures */}
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-gray-500">Misure Impatto</label>
                  <button type="button" onClick={() => setSurveyForm({...surveyForm, impactMeasures: [...surveyForm.impactMeasures, { label: "", value: "", unit: "m", fromReference: "" }]})} className="text-[10px] bg-teal-600 text-white px-2 py-1 rounded-lg font-bold">+ Aggiungi</button>
                </div>
                {surveyForm.impactMeasures.map((m, i) => (
                  <div key={i} className="grid grid-cols-4 gap-1 mb-2">
                    <input type="text" placeholder="Label" value={m.label} onChange={e => { const n = [...surveyForm.impactMeasures]; n[i].label = e.target.value; setSurveyForm({...surveyForm, impactMeasures: n}) }} className="p-2 bg-white border border-gray-200 rounded text-xs" />
                    <input type="text" placeholder="Valore" value={m.value} onChange={e => { const n = [...surveyForm.impactMeasures]; n[i].value = e.target.value; setSurveyForm({...surveyForm, impactMeasures: n}) }} className="p-2 bg-white border border-gray-200 rounded text-xs" />
                    <input type="text" placeholder="Udm" value={m.unit} onChange={e => { const n = [...surveyForm.impactMeasures]; n[i].unit = e.target.value; setSurveyForm({...surveyForm, impactMeasures: n}) }} className="p-2 bg-white border border-gray-200 rounded text-xs" />
                    <div className="flex gap-1">
                      <input type="text" placeholder="Da" value={m.fromReference} onChange={e => { const n = [...surveyForm.impactMeasures]; n[i].fromReference = e.target.value; setSurveyForm({...surveyForm, impactMeasures: n}) }} className="p-2 bg-white border border-gray-200 rounded text-xs flex-1" />
                      <button type="button" onClick={() => setSurveyForm({...surveyForm, impactMeasures: surveyForm.impactMeasures.filter((_, j) => j !== i)})} className="p-1 bg-red-100 text-red-500 rounded"><X size={12} /></button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Damage checkboxes */}
              <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                <label className="text-xs font-bold text-gray-500 block">Danni / Segnaletica</label>
                {[
                  { key: "signageDamaged", label: "Segnaletica danneggiata" },
                  { key: "roadMarkingsPresent", label: "Segnaletica orizzontale presente" },
                  { key: "trafficLightPresent", label: "Semaforo presente" },
                  { key: "trafficLightWorking", label: "Semaforo funzionante" },
                  { key: "guardRailDamaged", label: "Guard-rail danneggiato" },
                  { key: "publicLightingDamaged", label: "Illuminazione pubblica danneggiata" },
                ].map(item => (
                  <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={(surveyForm as any)[item.key] || false} onChange={e => setSurveyForm({...surveyForm, [item.key]: e.target.checked})} className="w-4 h-4" />
                    <span className="text-sm text-gray-600">{item.label}</span>
                  </label>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Altri Danni / Note</label>
                <textarea rows={2} value={surveyForm.otherDamages} onChange={e => setSurveyForm({...surveyForm, otherDamages: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900" />
              </div>
            </div>

            <button onClick={handleSaveSurvey} disabled={savingSurvey}
              className="w-full mt-4 py-4 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all">
              {savingSurvey ? <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div> : <MapPin size={18} />}
              Salva Rilievi
            </button>
          </div>
        </div>
      )}

      {/* ===== EXTERNAL UNIT MODAL ===== */}
      {showUnitModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowUnitModal(false)}>
          <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-5 max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2"><Building2 size={20} className="text-indigo-600" /> Ente Intervenuto</h2>
              <button onClick={() => setShowUnitModal(false)} className="p-2 rounded-full bg-gray-100"><X size={18} /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Tipo Ente</label>
                <select value={unitForm.unitType} onChange={e => setUnitForm({...unitForm, unitType: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900">
                  <option value="VVF">Vigili del Fuoco</option>
                  <option value="118">Servizio 118 / SUEM</option>
                  <option value="POLIZIA_STATO">Polizia di Stato</option>
                  <option value="CARABINIERI">Carabinieri</option>
                  <option value="GDF">Guardia di Finanza</option>
                  <option value="ANAS">ANAS / Autostrade</option>
                  <option value="COMUNE">Ufficio Tecnico Comune</option>
                  <option value="ALTRO">Altro Ente</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Nome / Distaccamento</label>
                  <input type="text" value={unitForm.unitName} onChange={e => setUnitForm({...unitForm, unitName: e.target.value})} placeholder="Es. Distaccamento Nord" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">ID Mezzo/Squadra</label>
                  <input type="text" value={unitForm.unitIdentifier} onChange={e => setUnitForm({...unitForm, unitIdentifier: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Ora Arrivo</label>
                  <input type="datetime-local" value={unitForm.arrivedAt} onChange={e => setUnitForm({...unitForm, arrivedAt: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Ora Partenza</label>
                  <input type="datetime-local" value={unitForm.leftAt} onChange={e => setUnitForm({...unitForm, leftAt: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Responsabile Ente</label>
                <input type="text" value={unitForm.officerInCharge} onChange={e => setUnitForm({...unitForm, officerInCharge: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Operazioni Svolte</label>
                <textarea rows={2} value={unitForm.actionsPerformed} onChange={e => setUnitForm({...unitForm, actionsPerformed: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">N. Rapporto (ente esterno)</label>
                <input type="text" value={unitForm.reportNumber} onChange={e => setUnitForm({...unitForm, reportNumber: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Note</label>
                <textarea rows={2} value={unitForm.notes} onChange={e => setUnitForm({...unitForm, notes: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900" />
              </div>
            </div>

            <button onClick={handleSaveUnit} disabled={savingUnit}
              className="w-full mt-4 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all">
              {savingUnit ? <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div> : <Building2 size={18} />}
              Registra Ente
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
