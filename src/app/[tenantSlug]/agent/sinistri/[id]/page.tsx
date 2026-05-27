"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Car, Users, Camera, Info, CheckCircle, Upload, X, AlertTriangle, ShieldAlert } from "lucide-react"
import toast from "react-hot-toast"
import { format } from "date-fns"

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
    licensePlate: "", vehicleType: "Autovettura", directionOfTravel: "", maneuver: "",
    isFugitive: false, insuranceCompany: "", insurancePolicy: "", damageDescription: "",
  })
  const [savingVehicle, setSavingVehicle] = useState(false)

  // Person modal
  const [showPersonModal, setShowPersonModal] = useState(false)
  const [personForm, setPersonForm] = useState({
    role: "CONDUCENTE", firstName: "", lastName: "", fiscalCode: "",
    licenseCategory: "", seatbeltUsed: false, isFugitive: false,
    injuries: "", injuriesDetail: "", alcoholTest: "", drugTest: "",
    vehicleIndex: -1 as number | null,
  })
  const [savingPerson, setSavingPerson] = useState(false)

  const fetchAccident = async () => {
    try {
      const res = await fetch(`/api/agent/accidents/${accidentId}`)
      if (res.ok) setAccident(await res.json())
      else toast.error("Errore nel caricamento")
    } catch { toast.error("Errore di rete") }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchAccident() }, [accidentId])

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
        setVehicleForm({ licensePlate: "", vehicleType: "Autovettura", directionOfTravel: "", maneuver: "", isFugitive: false, insuranceCompany: "", insurancePolicy: "", damageDescription: "" })
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
        setPersonForm({ role: "CONDUCENTE", firstName: "", lastName: "", fiscalCode: "", licenseCategory: "", seatbeltUsed: false, isFugitive: false, injuries: "", injuriesDetail: "", alcoholTest: "", drugTest: "", vehicleIndex: null })
        fetchAccident()
      } else toast.error((await res.json()).error || "Errore")
    } catch { toast.error("Errore di rete") }
    finally { setSavingPerson(false) }
  }

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

        <div className="flex justify-between mt-6 text-sm font-medium">
          {["info", "veicoli", "persone", "foto"].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`pb-2 px-2 border-b-2 ${activeTab === tab ? "border-red-500 text-white" : "border-transparent text-slate-400"}`}>
              {tab === "info" ? "Info" : tab === "veicoli" ? `Veicoli (${accident.vehicles?.length || 0})` : tab === "persone" ? `Persone (${accident.people?.length || 0})` : "Foto"}
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
              <button onClick={submitCompilation}
                className="w-full bg-green-600 text-white font-bold py-4 rounded-xl shadow-md flex items-center justify-center gap-2">
                <CheckCircle className="w-5 h-5" /> Invia in Revisione (richiede min 1 veicolo + 1 persona)
              </button>
            )}
          </div>
        )}

        {/* TAB VEICOLI */}
        {activeTab === "veicoli" && (
          <div className="space-y-4">
            {(accident.status === "BOZZA" || accident.status === "IN_COMPILAZIONE") && (
              <button onClick={() => setShowVehicleModal(true)}
                className="w-full bg-blue-50 text-blue-700 border border-blue-200 border-dashed py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-100 transition-colors">
                <Car className="w-5 h-5" /> Aggiungi Veicolo
              </button>
            )}

            {accident.vehicles?.map((v: any, idx: number) => (
              <div key={v.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
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
            {(accident.status === "BOZZA" || accident.status === "IN_COMPILAZIONE") && (
              <button onClick={() => setShowPersonModal(true)}
                className="w-full bg-purple-50 text-purple-700 border border-purple-200 border-dashed py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-purple-100 transition-colors">
                <Users className="w-5 h-5" /> Aggiungi Persona
              </button>
            )}

            {accident.people?.map((p: any) => {
              const vehicle = accident.vehicles?.find((v: any) => v.id === p.accidentVehicleId)
              return (
                <div key={p.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
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
                      {p.injuriesDetail && <p className="text-xs text-gray-400 mt-1">Dettaglio: {p.injuriesDetail}</p>}
                    </div>
                  </div>
                </div>
              )
            })}
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
            </div>

            <button onClick={handleSavePerson} disabled={savingPerson}
              className="w-full mt-4 py-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all">
              {savingPerson ? <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div> : <Users size={18} />}
              Salva Persona
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
