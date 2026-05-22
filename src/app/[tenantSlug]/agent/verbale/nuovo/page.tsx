"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { Camera, MapPin, Check, ChevronLeft, AlertTriangle, Search, X, Shield, Sparkles, FileText } from "lucide-react"

type AIResult = {
  id: string
  articoloId: string
  comma: string | null
  descrizione: string
  sanzioneMin: number
  sanzioneMax: number
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
  const [step, setStep] = useState(1) // 1=infrazione, 2=trasgressore, 3=riepilogo

  // AI Search state
  const [nlpText, setNlpText] = useState("")
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResults, setAiResults] = useState<AIResult[]>([])
  const [searched, setSearched] = useState(false)

  const [formData, setFormData] = useState({
    targa: "",
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
    patenteNumero: "",
    // Dati veicolo
    marcaVeicolo: "",
    modelloVeicolo: "",
    coloreVeicolo: "",
    cdsViolationId: ""
  })

  // Geolocation effect on mount
  useEffect(() => {
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
    if (nlpText.length < 3) return
    setAiLoading(true)
    setSearched(true)
    setError("")
    
    try {
      const res = await fetch("/api/agent/violations/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testo: nlpText })
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
      articoloCDS: `Art. ${result.articolo.articolo}${result.comma ? ` c. ${result.comma}` : ''}`,
      importo: result.sanzioneMin.toString(),
      puntiPatente: result.puntiPatente,
      cdsViolationId: result.id,
      tipoInfrazione: result.descrizione.length > 50 ? result.descrizione.substring(0, 47) + "..." : result.descrizione
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

      setSuccess(true)
      setTimeout(() => {
        router.push(`/${tenantSlug}?view=agent`)
      }, 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
        <div className="w-24 h-24 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mb-6 animate-in zoom-in duration-500">
          <Check size={48} />
        </div>
        <h1 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Verbale Emesso</h1>
        <p className="text-slate-400">Il verbale è stato registrato a sistema.</p>
      </div>
    )
  }

  const stepTitles = ["Infrazione", "Trasgressore", "Riepilogo"]

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-24">
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-white/5 p-4 flex items-center gap-4">
        <button onClick={() => step > 1 ? setStep(step - 1) : router.back()} className="p-2 bg-white/5 rounded-xl text-white/70 hover:bg-white/10 transition-colors active:scale-90">
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-sm font-black uppercase tracking-widest">Nuovo Verbale</h1>
          <p className="text-[10px] text-blue-400 font-bold">Step {step}/3 — {stepTitles[step - 1]}</p>
        </div>
      </header>

      <div className="px-4 pt-4">
        <div className="flex gap-2">
          {[1, 2, 3].map((s) => (
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

              {/* AI Search NLP */}
              <div className="space-y-2 relative">
                <label className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} /> Ricerca Intelligente Violazione
                </label>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={nlpText}
                    onChange={e => setNlpText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), searchNLP())}
                    className="flex-1 bg-slate-900 border border-blue-500/30 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-blue-200/30 text-blue-100"
                    placeholder="Es. Guidava al cellulare senza cintura..."
                  />
                  <button 
                    type="button"
                    onClick={searchNLP}
                    disabled={aiLoading || nlpText.length < 3}
                    className="p-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-2xl flex items-center justify-center transition-all"
                  >
                    {aiLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search size={20} />}
                  </button>
                </div>

                {/* AI Results Dropdown */}
                {searched && aiResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-10 animate-in slide-in-from-top-2">
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
                          <p className="text-sm font-bold text-white">Art. {res.articolo.articolo}{res.comma ? ` c. ${res.comma}` : ''}</p>
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{res.descrizione}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-black text-emerald-400">€{res.sanzioneMin}</p>
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

              {/* Selected Article Preview */}
              {formData.articoloCDS && !searched && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-start gap-3 animate-in fade-in">
                  <Check size={20} className="text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-sm font-black text-emerald-400">{formData.articoloCDS}</p>
                    <p className="text-xs text-emerald-500/70 mt-1">{formData.tipoInfrazione}</p>
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
                <input 
                  type="text" 
                  value={formData.indirizzo}
                  onChange={e => setFormData({...formData, indirizzo: e.target.value})}
                  className="w-full bg-slate-900 border border-white/10 rounded-2xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none mt-2"
                  placeholder="Indirizzo o via (opzionale se GPS attivo)"
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

          {/* STEP 2: TRASGRESSORE */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
                <p className="text-xs text-blue-400 font-bold uppercase tracking-wider mb-1">Dati Trasgressore (Opzionale)</p>
                <p className="text-[10px] text-slate-500">Se noti in contestazione, indica le generalità del conducente</p>
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

              <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                <p className="text-xs text-amber-400 font-bold uppercase tracking-wider mb-1">Dati Veicolo</p>
                <p className="text-[10px] text-slate-500">Marca, modello e colore per identificazione</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Marca</label>
                  <input 
                    type="text"
                    value={formData.marcaVeicolo}
                    onChange={e => setFormData({...formData, marcaVeicolo: e.target.value})}
                    className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Fiat"
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
                  <p className="text-xs text-slate-400 mt-0.5">{formData.tipoInfrazione}</p>
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
                    Si dà atto che il veicolo tg. {formData.targa} {formData.marcaVeicolo} {formData.modelloVeicolo} procedeva violando l'Art. {formData.articoloCDS} del C.d.S. ({formData.tipoInfrazione.toLowerCase()}). 
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
