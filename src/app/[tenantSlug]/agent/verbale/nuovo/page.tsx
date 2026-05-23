"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { Camera, MapPin, Check, ChevronLeft, AlertTriangle, Search, X, Shield, Sparkles, FileText, User, Building } from "lucide-react"
import { StreetSearchAutocomplete } from "@/components/StreetSearchAutocomplete"
import { MunicipalityAutocomplete } from "@/components/MunicipalityAutocomplete"
import { VehicleBrandAutocomplete } from "@/components/VehicleBrandAutocomplete"

type AIResult = {
  id: string
  articoloId: string
  comma: string | null
  codice: string | null
  descrizione: string
  sanzione: number
  sanzioneScontata: number | null
  puntiPatente: number
  articolo: { articolo: number }
  score: number
}

export default function NuovoVerbalePage() {
  const router = useRouter()
  const { tenantSlug } = useParams<{ tenantSlug: string }>()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [photos, setPhotos] = useState<string[]>([])
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState(0) // 0=tipo doc, 1=infrazione, 2=trasgressore, 3=riepilogo
  const [contestazioneImmediata, setContestazioneImmediata] = useState<boolean | null>(null)
  const [isObbligatoAzienda, setIsObbligatoAzienda] = useState(false)

  // AI Search state
  const [nlpText, setNlpText] = useState("")
  const [searchArticolo, setSearchArticolo] = useState("")
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResults, setAiResults] = useState<AIResult[]>([])
  const [searched, setSearched] = useState(false)

  const [formData, setFormData] = useState({
    targa: "",
    tipoVeicolo: "",
    tipoInfrazione: "ALTRO", // Default, will be updated by AI if matched
    articoloCDS: "",
    importo: "",
    puntiPatente: 0,
    note: "",
    lat: null as number | null,
    lng: null as number | null,
    indirizzo: "",
    // Dati trasgressore
    trasgressoreNome: "",
    trasgressoreCognome: "",
    trasgressoreDataNascita: "",
    trasgressoreLuogoNascita: "",
    trasgressoreIndirizzo: "",
    trasgressoreComuneResidenza: "",
    // Dati obbligato in solido
    obbligatoNome: "",
    obbligatoCognome: "",
    obbligatoPartitaIva: "",
    obbligatoIndirizzo: "",
    obbligatoComuneResidenza: "",
    // Dati patente
    patenteNumero: "",
    patenteEnteRilascio: "",
    patenteDataRilascio: "",
    patenteDataScadenza: "",
    patenteCategoria: "",
    // Dati veicolo
    marcaVeicolo: "",
    modelloVeicolo: "",
    coloreVeicolo: "",
    cdsViolationId: "",
    // Nuovi campi
    documentType: "", // PREAVVISO o VERBALE
    motivoMancataContestazione: ""
  })

  // Geolocation effect on mount
  const [vehicleTypes, setVehicleTypes] = useState<any[]>([])

  useEffect(() => {
    // Fetch vehicle types
    fetch('/api/agent/vehicles/types')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setVehicleTypes(data)
      })
      .catch(err => console.error(err))

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }))
        },
        (err) => console.warn("Errore GPS", err),
        { enableHighAccuracy: true }
      )
    }
  }, [])

  const searchNLP = async () => {
    if (nlpText.length < 3 && searchArticolo.length === 0) return
    setAiLoading(true)
    setSearched(true)
    setError("")
    
    try {
      const res = await fetch("/api/agent/violations/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testo: nlpText, articolo: searchArticolo })
      })
      
      if (res.ok) {
        const data = await res.json()
        setAiResults(data.risultati || [])
      } else {
        const err = await res.json()
        setError(err.error || "Errore durante la ricerca intelligente")
      }
    } catch (e) {
      setError("Errore di connessione al motore AI")
    } finally {
      setAiLoading(false)
    }
  }

  const selectAIResult = (result: AIResult) => {
    setFormData(prev => ({
      ...prev,
      articoloCDS: `Art. ${result.articolo?.articolo || ''}${result.comma ? ` c. ${result.comma}` : ''}`,
      importo: result.sanzione?.toString() || "0",
      puntiPatente: result.puntiPatente || 0,
      cdsViolationId: result.id,
      tipoInfrazione: result.descrizione || "" // Intero testo della violazione
    }))
    setAiResults([])
    setSearched(false)
  }

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    
    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotos((prev) => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ""
  }

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  const [createdViolationId, setCreatedViolationId] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/agent/violations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          importo: parseFloat(formData.importo),
          foto: photos
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Errore durante il salvataggio")
      }

      const newViolation = await res.json()
      setCreatedViolationId(newViolation.id)
      setSuccess(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPdf = () => {
    if (createdViolationId) {
      window.open(`/api/agent/violations/${createdViolationId}/pdf`, "_blank")
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
        <div className="w-24 h-24 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mb-6 animate-in zoom-in duration-500">
          <Check size={48} />
        </div>
        <h1 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">
          {formData.documentType === 'PREAVVISO' ? 'Preavviso Emesso' : 'Verbale Emesso'}
        </h1>
        <p className="text-slate-400 mb-8">Il documento è stato registrato a sistema.</p>
        
        <button 
          onClick={handleDownloadPdf}
          className="w-full max-w-xs p-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-500/20 mb-4"
        >
          <FileText size={20} /> Stampa Documento
        </button>

        <button 
          onClick={() => router.push(`/${tenantSlug}?view=agent`)}
          className="w-full max-w-xs p-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold transition-all active:scale-95"
        >
          Torna alla Home
        </button>
      </div>
    )
  }

  const stepTitles = ["Tipo Documento", "Infrazione", "Trasgressore", "Riepilogo"]

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-24">
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-white/5 p-4 flex items-center gap-4">
        <button onClick={() => step > 0 ? setStep(step - 1) : router.back()} className="p-2 bg-white/5 rounded-xl text-white/70 hover:bg-white/10 transition-colors active:scale-90">
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-sm font-black uppercase tracking-widest">Nuovo Accertamento</h1>
          <p className="text-[10px] text-blue-400 font-bold">Step {step + 1}/4 — {stepTitles[step]}</p>
        </div>
      </header>

      <div className="px-4 pt-4">
        <div className="flex gap-2">
          {[0, 1, 2, 3].map((s) => (
            <div key={s} className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${s <= step ? "bg-blue-500" : "bg-white/10"}`} />
          ))}
        </div>
      </div>

      <main className="p-4 max-w-lg mx-auto">
        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl mb-6 flex items-start gap-3 text-sm font-medium animate-in slide-in-from-top duration-300">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* STEP 0: TIPO DOCUMENTO E CONTESTAZIONE */}
          {step === 0 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cosa stai redigendo?</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({...formData, documentType: "PREAVVISO"})
                      setContestazioneImmediata(false)
                      setStep(1)
                    }}
                    className="p-6 bg-slate-900 border border-white/10 hover:border-blue-500/50 rounded-2xl flex flex-col items-center gap-3 transition-all"
                  >
                    <FileText size={32} className="text-blue-400" />
                    <span className="font-bold text-sm">Preavviso Sosta</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, documentType: "VERBALE"})}
                    className={`p-6 bg-slate-900 border ${formData.documentType === "VERBALE" ? "border-blue-500" : "border-white/10"} hover:border-blue-500/50 rounded-2xl flex flex-col items-center gap-3 transition-all`}
                  >
                    <Shield size={32} className="text-blue-400" />
                    <span className="font-bold text-sm">Verbale C.d.S.</span>
                  </button>
                </div>
              </div>

              {formData.documentType === "VERBALE" && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Contestazione Immediata?</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setContestazioneImmediata(true)}
                      className={`p-4 bg-slate-900 border ${contestazioneImmediata === true ? "border-emerald-500 text-emerald-400" : "border-white/10 text-white"} rounded-2xl font-bold transition-all`}
                    >
                      Sì, trasgressore presente
                    </button>
                    <button
                      type="button"
                      onClick={() => setContestazioneImmediata(false)}
                      className={`p-4 bg-slate-900 border ${contestazioneImmediata === false ? "border-rose-500 text-rose-400" : "border-white/10 text-white"} rounded-2xl font-bold transition-all`}
                    >
                      No, trasgressore assente
                    </button>
                  </div>
                  
                  {contestazioneImmediata === false && (
                    <div className="space-y-2 animate-in fade-in duration-300">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Motivo mancata contestazione *</label>
                      <select 
                        required
                        value={formData.motivoMancataContestazione}
                        onChange={e => setFormData({...formData, motivoMancataContestazione: e.target.value})}
                        className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-white appearance-none"
                      >
                        <option value="">Seleziona motivo...</option>
                        <option value="Assenza del trasgressore e del proprietario del veicolo">Assenza del trasgressore e del proprietario del veicolo</option>
                        <option value="Impossibilità di raggiungere un veicolo lanciato a velocità eccessiva">Veicolo lanciato a velocità eccessiva</option>
                        <option value="Veicolo in transito">Veicolo in transito</option>
                        <option value="Impossibilità di fermare il veicolo in condizioni di sicurezza">Impossibilità di fermare il veicolo in condizioni di sicurezza</option>
                        <option value="Attraversamento di un incrocio con semaforo rosso">Attraversamento incrocio con semaforo rosso</option>
                        <option value="Sorpasso vietato">Sorpasso vietato</option>
                        <option value="Accertamento della violazione per mezzo di appositi apparecchi">Accertamento tramite apparecchiature</option>
                        <option value="Altro (specificare nelle note)">Altro (specificare nelle note)</option>
                      </select>
                    </div>
                  )}
                </div>
              )}

              {formData.documentType === "VERBALE" && contestazioneImmediata !== null && (
                <button type="button" onClick={() => setStep(1)} className="w-full p-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold transition-all">
                  Procedi all'Infrazione
                </button>
              )}
            </div>
          )}

          {/* STEP 1: INFRAZIONE */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              {/* Targa */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Targa Veicolo *</label>
                <input 
                  type="text" 
                  required
                  value={formData.targa}
                  onChange={e => setFormData({...formData, targa: e.target.value.toUpperCase()})}
                  className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-xl font-black text-center uppercase focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none tracking-widest"
                  placeholder="AB123CD"
                  maxLength={10}
                />
              </div>

              {/* AI Search NLP & Articolo */}
              <div className="space-y-3 relative">
                <label className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} /> Ricerca Intelligente Violazione
                </label>
                
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={searchArticolo}
                    onChange={e => setSearchArticolo(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), searchNLP())}
                    className="w-24 bg-slate-900 border border-blue-500/30 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-blue-200/30 text-blue-100"
                    placeholder="Art."
                  />
                  <input 
                    type="text"
                    value={nlpText}
                    onChange={e => setNlpText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), searchNLP())}
                    className="flex-1 bg-slate-900 border border-blue-500/30 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-blue-200/30 text-blue-100"
                    placeholder="Es. Guidava al cellulare..."
                  />
                  <button 
                    type="button"
                    onClick={searchNLP}
                    disabled={aiLoading || (nlpText.length < 3 && searchArticolo.length === 0)}
                    className="p-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-2xl flex items-center justify-center transition-all"
                  >
                    {aiLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search size={20} />}
                  </button>
                </div>

                {/* AI Results Dropdown */}
                {searched && aiResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-white/10 rounded-2xl shadow-2xl z-20 max-h-80 overflow-y-auto animate-in slide-in-from-top-2 overflow-hidden scrollbar-thin scrollbar-thumb-white/20">
                    {aiResults.map((res, i) => (
                      <button
                        key={res.id}
                        type="button"
                        onClick={() => selectAIResult(res)}
                        className={`w-full text-left p-4 hover:bg-white/5 transition-all flex items-start gap-3 ${i !== aiResults.length - 1 ? 'border-b border-white/5' : ''}`}
                      >
                        <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl shrink-0 mt-1">
                          <FileText size={16} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-white">Art. {res.articolo?.articolo || ''}{res.comma ? ` c. ${res.comma}` : ''}</p>
                            {res.codice && <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-[10px] rounded-md font-mono border border-blue-500/30">Cod. {res.codice}</span>}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{res.descrizione}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-black text-emerald-400">€{res.sanzione}</p>
                          {res.puntiPatente > 0 && <p className="text-[10px] font-bold text-rose-400">-{res.puntiPatente} pt</p>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {searched && aiResults.length === 0 && !aiLoading && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-rose-500/30 rounded-2xl p-4 text-sm text-center text-rose-300 z-10">
                    Nessuna corrispondenza trovata. Riprova con altre parole chiave.
                  </div>
                )}
              </div>

              {/* Selected Article Preview & Editable Description */}
              {formData.articoloCDS && !searched && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-start gap-3">
                    <Check size={20} className="text-emerald-500 shrink-0" />
                    <div>
                      <p className="text-sm font-black text-emerald-400">{formData.articoloCDS}</p>
                      <p className="text-xs text-emerald-500/70 mt-1">Sanzione selezionata e importi precompilati</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Testo della Violazione</label>
                    <textarea 
                      required
                      value={formData.tipoInfrazione}
                      onChange={e => setFormData({...formData, tipoInfrazione: e.target.value})}
                      className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-emerald-500 outline-none min-h-[120px] resize-none text-emerald-50"
                      placeholder="Descrizione della sanzione..."
                    />
                  </div>
                </div>
              )}

              {/* Auto-filled fields from prontuario */}
              <div className="grid grid-cols-2 gap-4">
                {/* Importo */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Importo (€) *</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    value={formData.importo}
                    onChange={e => setFormData({...formData, importo: e.target.value})}
                    className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-sm font-black focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="0.00"
                  />
                </div>

                {/* Punti Patente (read-only from prontuario) */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Punti Patente</label>
                  <div className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-sm font-black flex items-center gap-2">
                    <Shield size={16} className={formData.puntiPatente > 0 ? "text-rose-500" : "text-slate-600"} />
                    <span className={formData.puntiPatente > 0 ? "text-rose-500" : "text-slate-600"}>
                      {formData.puntiPatente > 0 ? `-${formData.puntiPatente}` : "0"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Posizione */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Luogo Infrazione</label>
                <div className="flex items-center gap-3 p-4 bg-slate-900 border border-white/10 rounded-2xl">
                  <div className={`p-2 rounded-xl ${formData.lat ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-slate-500'}`}>
                    <MapPin size={18} />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-medium truncate">
                      {formData.lat ? `Lat: ${formData.lat.toFixed(5)}, Lng: ${formData.lng?.toFixed(5)}` : "Acquisizione GPS in corso..."}
                    </p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                      {formData.lat ? "✓ Precisione Alta" : "In attesa..."}
                    </p>
                  </div>
                </div>
                <StreetSearchAutocomplete
                  value={formData.indirizzo}
                  onChange={val => setFormData({...formData, indirizzo: val})}
                  placeholder="Indirizzo o via (opzionale se GPS attivo)"
                  className="mt-2"
                />
              </div>

              {/* Fotografia */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Prova Fotografica</label>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  onChange={handlePhotoCapture}
                  className="hidden"
                />

                {photos.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {photos.map((photo, i) => (
                      <div key={i} className="relative shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-white/10">
                        <img src={photo} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                        <button 
                          type="button" 
                          onClick={() => removePhoto(i)}
                          className="absolute top-1 right-1 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button 
                  type="button" 
                  onClick={() => photoInputRef.current?.click()}
                  className="w-full p-5 border-2 border-dashed border-white/10 hover:border-blue-500/50 hover:bg-blue-500/5 rounded-3xl flex flex-col items-center justify-center gap-2 transition-colors text-slate-400 hover:text-blue-400 active:scale-95"
                >
                  <Camera size={28} />
                  <span className="text-xs font-bold uppercase tracking-widest">
                    {photos.length > 0 ? `${photos.length} foto — Aggiungi altra` : "Scatta Foto"}
                  </span>
                </button>
              </div>

              {/* Note */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Note Operative (Opzionale)</label>
                <textarea 
                  value={formData.note}
                  onChange={e => setFormData({...formData, note: e.target.value})}
                  className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none min-h-[80px] resize-none"
                  placeholder="Dettagli aggiuntivi per il rapporto..."
                />
              </div>

              <button 
                type="button"
                onClick={() => {
                  if (!formData.targa || !formData.articoloCDS || !formData.importo) {
                    setError("Compila targa e cerca un'infrazione con l'assistente AI prima di continuare")
                    return
                  }
                  setError("")
                  setStep(2)
                }}
                className="w-full p-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-blue-900/40 transition-all active:scale-[0.98]"
              >
                Continua →
              </button>
            </div>
          )}

          {/* STEP 2: TRASGRESSORE E OBBLIGATO */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
                <p className="text-xs text-blue-400 font-bold uppercase tracking-wider mb-1">Dati Trasgressore (Opzionale)</p>
                <p className="text-[10px] text-slate-500">Se noti, indica le generalità del conducente</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nome</label>
                  <input 
                    type="text"
                    value={formData.trasgressoreNome}
                    onChange={e => setFormData({...formData, trasgressoreNome: e.target.value})}
                    className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Mario"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cognome</label>
                  <input 
                    type="text"
                    value={formData.trasgressoreCognome}
                    onChange={e => setFormData({...formData, trasgressoreCognome: e.target.value})}
                    className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Rossi"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Data di Nascita</label>
                  <input 
                    type="date"
                    value={formData.trasgressoreDataNascita}
                    onChange={e => setFormData({...formData, trasgressoreDataNascita: e.target.value})}
                    className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-white [color-scheme:dark]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Luogo di Nascita</label>
                  <MunicipalityAutocomplete
                    value={formData.trasgressoreLuogoNascita}
                    onChange={val => setFormData({...formData, trasgressoreLuogoNascita: val})}
                    placeholder="Es. Roma"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Comune di Residenza</label>
                <MunicipalityAutocomplete
                  value={formData.trasgressoreComuneResidenza}
                  onChange={val => setFormData({...formData, trasgressoreComuneResidenza: val})}
                  placeholder="Es. Milano (MI)"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Indirizzo di Residenza (Via e N.Civico)</label>
                <input 
                  type="text"
                  value={formData.trasgressoreIndirizzo}
                  onChange={e => setFormData({...formData, trasgressoreIndirizzo: e.target.value})}
                  className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Via Roma 1"
                />
              </div>

              {/* PATENTE */}
              <div className="p-4 bg-purple-500/5 border border-purple-500/10 rounded-2xl mt-8">
                <p className="text-xs text-purple-400 font-bold uppercase tracking-wider mb-1">Patente di Guida</p>
                <p className="text-[10px] text-slate-500">Estremi del documento di guida del trasgressore</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Numero Patente</label>
                  <input 
                    type="text"
                    value={formData.patenteNumero}
                    onChange={e => setFormData({...formData, patenteNumero: e.target.value.toUpperCase()})}
                    className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                    placeholder="U1XXXXXXXX"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Categoria</label>
                  <input 
                    type="text"
                    value={formData.patenteCategoria}
                    onChange={e => setFormData({...formData, patenteCategoria: e.target.value.toUpperCase()})}
                    className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                    placeholder="Es. B"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ente di Rilascio</label>
                <select
                  value={formData.patenteEnteRilascio}
                  onChange={e => setFormData({...formData, patenteEnteRilascio: e.target.value})}
                  className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-white appearance-none"
                >
                  <option value="">Seleziona ente...</option>
                  <option value="MCTC">MCTC (Motorizzazione)</option>
                  <option value="Prefettura">Prefettura</option>
                  <option value="UCO">UCO (Ufficio Centrale Operativo)</option>
                  <option value="Estero">Autorità Estera</option>
                  <option value="Altro">Altro</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Data Rilascio</label>
                  <input 
                    type="date"
                    value={formData.patenteDataRilascio}
                    onChange={e => setFormData({...formData, patenteDataRilascio: e.target.value})}
                    className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-white [color-scheme:dark]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Data Scadenza</label>
                  <input 
                    type="date"
                    value={formData.patenteDataScadenza}
                    onChange={e => setFormData({...formData, patenteDataScadenza: e.target.value})}
                    className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-white [color-scheme:dark]"
                  />
                </div>
              </div>

              {/* OBBLIGATO IN SOLIDO */}
              <div className="p-4 bg-orange-500/5 border border-orange-500/10 rounded-2xl mt-8">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-orange-400 font-bold uppercase tracking-wider">Obbligato in Solido (Opzionale)</p>
                  <div className="flex bg-slate-900 rounded-lg p-1 border border-white/5">
                    <button 
                      type="button"
                      onClick={() => setIsObbligatoAzienda(false)}
                      className={`px-3 py-1 text-xs font-bold rounded-md flex items-center gap-1.5 transition-all ${!isObbligatoAzienda ? 'bg-orange-500 text-white' : 'text-slate-500 hover:text-white'}`}
                    >
                      <User size={12} /> Persona
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        setIsObbligatoAzienda(true)
                        setFormData({...formData, obbligatoCognome: ""})
                      }}
                      className={`px-3 py-1 text-xs font-bold rounded-md flex items-center gap-1.5 transition-all ${isObbligatoAzienda ? 'bg-orange-500 text-white' : 'text-slate-500 hover:text-white'}`}
                    >
                      <Building size={12} /> Azienda
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500">Proprietario del veicolo o altro soggetto responsabile in solido</p>
              </div>

              {isObbligatoAzienda ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ragione Sociale</label>
                    <input 
                      type="text"
                      value={formData.obbligatoNome}
                      onChange={e => setFormData({...formData, obbligatoNome: e.target.value})}
                      className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                      placeholder="Nome Azienda SRL"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Partita IVA o C.F.</label>
                    <input 
                      type="text"
                      value={formData.obbligatoPartitaIva}
                      onChange={e => setFormData({...formData, obbligatoPartitaIva: e.target.value})}
                      className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-sm font-mono focus:ring-2 focus:ring-orange-500 outline-none uppercase"
                      placeholder="IT01234567890"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nome</label>
                    <input 
                      type="text"
                      value={formData.obbligatoNome}
                      onChange={e => setFormData({...formData, obbligatoNome: e.target.value})}
                      className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                      placeholder="Luigi"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cognome</label>
                    <input 
                      type="text"
                      value={formData.obbligatoCognome}
                      onChange={e => setFormData({...formData, obbligatoCognome: e.target.value})}
                      className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                      placeholder="Bianchi"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Comune Sede/Residenza</label>
                <MunicipalityAutocomplete
                  value={formData.obbligatoComuneResidenza}
                  onChange={val => setFormData({...formData, obbligatoComuneResidenza: val})}
                  placeholder="Es. Torino (TO)"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Indirizzo (Via e N.Civico)</label>
                <input 
                  type="text"
                  value={formData.obbligatoIndirizzo}
                  onChange={e => setFormData({...formData, obbligatoIndirizzo: e.target.value})}
                  className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="Via Milano 10"
                />
              </div>

              <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                <p className="text-xs text-amber-400 font-bold uppercase tracking-wider mb-1">Dati Veicolo</p>
                <p className="text-[10px] text-slate-500">Marca, modello e colore per identificazione</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tipo Veicolo</label>
                  <select
                    value={formData.tipoVeicolo}
                    onChange={e => setFormData({...formData, tipoVeicolo: e.target.value})}
                    className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-white appearance-none"
                  >
                    <option value="">Seleziona tipologia...</option>
                    {vehicleTypes.map((vt: any) => (
                      <option key={vt.id} value={vt.descrizione}>{vt.descrizione} ({vt.codice})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Marca</label>
                  <VehicleBrandAutocomplete
                    value={formData.marcaVeicolo}
                    onChange={val => setFormData({...formData, marcaVeicolo: val})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Modello</label>
                  <input 
                    type="text"
                    value={formData.modelloVeicolo}
                    onChange={e => setFormData({...formData, modelloVeicolo: e.target.value})}
                    className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Panda"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Colore</label>
                <input 
                  type="text"
                  value={formData.coloreVeicolo}
                  onChange={e => setFormData({...formData, coloreVeicolo: e.target.value})}
                  className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Bianco"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full p-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold uppercase tracking-widest text-sm transition-all active:scale-[0.98] border border-white/10"
                >
                  ← Indietro
                </button>
                <button 
                  type="button"
                  onClick={() => setStep(3)}
                  className="w-full p-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-blue-900/40 transition-all active:scale-[0.98]"
                >
                  Riepilogo →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: RIEPILOGO */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="p-5 bg-slate-900 border border-white/5 rounded-2xl space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-blue-400">Verbale di Accertamento</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Targa</p>
                    <p className="text-xl font-black tracking-widest mt-1">{formData.targa}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Importo</p>
                    <p className="text-xl font-black text-emerald-500 mt-1">€ {parseFloat(formData.importo || "0").toFixed(2)}</p>
                  </div>
                </div>

                <div className="border-t border-white/5 pt-4">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Violazione</p>
                  <p className="text-sm font-bold mt-1">{formData.articoloCDS}</p>
                  <p className="text-xs text-slate-400 mt-0.5 whitespace-pre-wrap">{formData.tipoInfrazione}</p>
                  {formData.puntiPatente > 0 && (
                    <p className="text-xs text-rose-500 font-bold mt-1">-{formData.puntiPatente} punti patente</p>
                  )}
                </div>

                {formData.indirizzo && (
                  <div className="border-t border-white/5 pt-4">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Luogo</p>
                    <p className="text-sm mt-1 flex items-center gap-2"><MapPin size={14} className="text-blue-400" /> {formData.indirizzo}</p>
                  </div>
                )}

                {(formData.trasgressoreCognome || formData.trasgressoreNome) && (
                  <div className="border-t border-white/5 pt-4">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Trasgressore</p>
                    <p className="text-sm font-bold mt-1">{formData.trasgressoreNome} {formData.trasgressoreCognome}</p>
                    {formData.patenteNumero && <p className="text-xs text-slate-400 mt-0.5 font-mono">Patente: {formData.patenteNumero}</p>}
                  </div>
                )}

                {formData.marcaVeicolo && (
                  <div className="border-t border-white/5 pt-4">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Veicolo</p>
                    <p className="text-sm mt-1">{formData.marcaVeicolo} {formData.modelloVeicolo} — {formData.coloreVeicolo}</p>
                  </div>
                )}

                {photos.length > 0 && (
                  <div className="border-t border-white/5 pt-4">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2">{photos.length} Foto Allegate</p>
                    <div className="flex gap-2 overflow-x-auto">
                      {photos.map((p, i) => (
                        <img key={i} src={p} alt={`Foto ${i + 1}`} className="w-16 h-16 rounded-xl object-cover border border-white/10" />
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t border-white/5 pt-4">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2">Testo Verbale Generato</p>
                  <div className="p-3 bg-white/5 rounded-xl text-[10px] text-slate-300 font-mono leading-relaxed">
                    Si dà atto che il veicolo tg. {formData.targa} {formData.marcaVeicolo} {formData.modelloVeicolo} procedeva violando l'Art. {formData.articoloCDS} del C.d.S. ({formData.tipoInfrazione}). 
                    {formData.indirizzo ? ` Accertamento in ${formData.indirizzo}.` : ""}
                    {formData.trasgressoreCognome ? ` Conducente identificato in ${formData.trasgressoreNome} ${formData.trasgressoreCognome}.` : ""}
                    {formData.note ? ` Note: ${formData.note}` : ""}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full p-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold uppercase tracking-widest text-sm transition-all active:scale-[0.98] border border-white/10"
                >
                  ← Modifica
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full p-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-blue-900/40 transition-all disabled:opacity-50 disabled:hover:bg-blue-600 active:scale-[0.98]"
                >
                  {loading ? "Emissione..." : "Emetti ✓"}
                </button>
              </div>
            </div>
          )}

        </form>
      </main>
    </div>
  )
}
