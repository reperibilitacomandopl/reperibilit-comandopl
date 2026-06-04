"use client"

import { useState, useRef, useCallback } from "react"
import {
  Upload, FileText, Eye, Save, AlertTriangle, CheckCircle,
  Loader2, RotateCw, X, ChevronDown, ChevronUp, Edit3, Trash2, Camera
} from "lucide-react"

type OcrVehicle = {
  ora_controllo?: string
  targa?: string
  veicolo?: string
  marca_modello?: string
  ultima_revisione?: string
  assicurazione?: string
  assicurato_fino?: string
  proprietario_cognome?: string
  proprietario_nome?: string
  proprietario_data_nascita?: string
  proprietario_luogo_nascita?: string
  proprietario_residenza?: string
  proprietario_indirizzo?: string
  conducente_stesso_prop?: boolean
  conducente_cognome?: string
  conducente_nome?: string
  conducente_data_nascita?: string
  conducente_luogo_nascita?: string
  conducente_residenza?: string
  conducente_indirizzo?: string
  patente_numero?: string
  patente_rilasciata_da?: string
  patente_data_rilascio?: string
  patente_validita_fino?: string
  sanzione_elevata?: string
  sanzione_accessoria?: string
  passeggero_cognome?: string
  passeggero_nome?: string
  passeggero_data_nascita?: string
  passeggero_luogo_nascita?: string
  passeggero_residenza?: string
  passeggero_indirizzo?: string
}

type OcrResult = {
  controllo: {
    data_controllo?: string
    ora_inizio?: string
    ora_fine?: string
    luogo?: string
    operatori?: string
  }
  veicoli: OcrVehicle[]
}

export default function CheckpointImporter({ isDark, onImportComplete }: { isDark: boolean; onImportComplete: () => void }) {
  const [step, setStep] = useState<"upload" | "processing" | "review" | "saving" | "done">("upload")
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedVehicle, setExpandedVehicle] = useState<number | null>(null)
  const [saveResult, setSaveResult] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const cardBg = isDark ? "bg-slate-900 border-white/5" : "bg-white border-slate-200"
  const inputBg = isDark ? "bg-slate-950 border-white/10 text-white placeholder-white/30" : "bg-white border-slate-200 text-slate-900 placeholder-slate-400"
  const mutedText = isDark ? "text-white/40" : "text-slate-400"

  const handleFileSelect = useCallback((f: File) => {
    setFile(f)
    setError(null)
    // Generate preview for images
    if (f.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = e => setPreview(e.target?.result as string)
      reader.readAsDataURL(f)
    } else {
      setPreview(null)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) handleFileSelect(f)
  }, [handleFileSelect])

  const processOCR = async () => {
    if (!file) return
    setStep("processing")
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/admin/checkpoints/import', {
        method: 'POST',
        body: formData
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Errore durante il processamento OCR')
        setStep("upload")
        return
      }

      setOcrResult({
        controllo: data.controllo || {},
        veicoli: (data.veicoli || []).filter((v: OcrVehicle) => v.targa)
      })
      setStep("review")

    } catch (err) {
      setError('Errore di connessione al server')
      setStep("upload")
    }
  }

  const confirmImport = async () => {
    if (!ocrResult) return
    setStep("saving")

    try {
      const res = await fetch('/api/admin/checkpoints/import/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ocrResult)
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Errore durante il salvataggio')
        setStep("review")
        return
      }

      setSaveResult(data)
      setStep("done")

    } catch {
      setError('Errore di connessione al server')
      setStep("review")
    }
  }

  const updateControlloField = (field: string, value: string) => {
    if (!ocrResult) return
    setOcrResult({
      ...ocrResult,
      controllo: { ...ocrResult.controllo, [field]: value }
    })
  }

  const updateVehicleField = (idx: number, field: string, value: any) => {
    if (!ocrResult) return
    const veicoli = [...ocrResult.veicoli]
    veicoli[idx] = { ...veicoli[idx], [field]: value }
    setOcrResult({ ...ocrResult, veicoli })
  }

  const removeVehicle = (idx: number) => {
    if (!ocrResult) return
    setOcrResult({
      ...ocrResult,
      veicoli: ocrResult.veicoli.filter((_, i) => i !== idx)
    })
  }

  const reset = () => {
    setStep("upload")
    setFile(null)
    setPreview(null)
    setOcrResult(null)
    setError(null)
    setSaveResult(null)
  }

  return (
    <div className="space-y-6">
      {/* STEP: UPLOAD */}
      {step === "upload" && (
        <div className={`rounded-3xl border ${cardBg} p-8 shadow-sm`}>
          <h2 className="text-lg font-black mb-2 flex items-center gap-3">
            <Upload size={20} className="text-purple-500" /> Importa Scheda via OCR
          </h2>
          <p className={`text-sm mb-6 ${mutedText}`}>Carica un PDF o immagine della scheda di controllo compilata a mano. Gemini AI estrarrà automaticamente i dati.</p>

          {error && (
            <div className="mb-4 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-sm font-bold flex items-center gap-2">
              <AlertTriangle size={16} /> {error}
            </div>
          )}

          <div
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
              file
                ? "border-blue-500/40 bg-blue-500/5"
                : isDark ? "border-white/10 hover:border-white/20 hover:bg-white/5" : "border-slate-300 hover:border-slate-400 hover:bg-slate-50"
            }`}
          >
            <input ref={fileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.tiff,.bmp" onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])} className="hidden" />

            {file ? (
              <div className="space-y-3">
                {preview && <img src={preview} alt="Anteprima" className="max-h-64 mx-auto rounded-xl shadow-lg" />}
                <div className="flex items-center justify-center gap-3">
                  <FileText size={24} className="text-blue-500" />
                  <div>
                    <p className="font-bold">{file.name}</p>
                    <p className={`text-xs ${mutedText}`}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <Upload size={48} className={`mx-auto mb-4 ${mutedText}`} />
                <p className="font-bold text-lg mb-1">Trascina qui la scheda</p>
                <p className={`text-sm ${mutedText}`}>Oppure clicca per selezionare un file (PDF, PNG, JPG, TIFF)</p>
              </div>
            )}
          </div>

          {file && (
            <div className="flex justify-end mt-6 gap-3">
              <button onClick={reset} className={`px-4 py-3 text-sm font-bold rounded-xl ${isDark ? "bg-white/5 hover:bg-white/10" : "bg-slate-100 hover:bg-slate-200"}`}>
                Annulla
              </button>
              <button onClick={processOCR}
                className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-purple-600/20 active:scale-95">
                <Eye size={16} /> Analizza con Gemini AI
              </button>
            </div>
          )}
        </div>
      )}

      {/* STEP: PROCESSING */}
      {step === "processing" && (
        <div className={`rounded-3xl border ${cardBg} p-12 shadow-sm text-center`}>
          <div className="w-16 h-16 mx-auto mb-6 bg-purple-500/10 rounded-2xl flex items-center justify-center">
            <Loader2 size={32} className="text-purple-500 animate-spin" />
          </div>
          <h2 className="text-lg font-black mb-2">Analisi in corso...</h2>
          <p className={`text-sm ${mutedText}`}>Gemini AI sta leggendo la scheda. Potrebbe richiedere 10-30 secondi.</p>
        </div>
      )}

      {/* STEP: REVIEW */}
      {step === "review" && ocrResult && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
          
          {/* Colonna Sinistra: Anteprima Sticky */}
          <div className="hidden xl:block sticky top-6 space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest opacity-60 flex items-center gap-2">
              <Camera size={16} /> Scansione Originale
            </h3>
            {preview ? (
              <div className={`rounded-3xl border ${cardBg} p-2 overflow-hidden shadow-sm`}>
                <img src={preview} alt="Anteprima Scheda" className="w-full h-auto max-h-[85vh] object-contain rounded-2xl bg-slate-100 dark:bg-slate-800" />
              </div>
            ) : (
              <div className={`rounded-3xl border ${cardBg} p-8 flex items-center justify-center text-center h-[50vh]`}>
                <p className={mutedText}>Anteprima non disponibile (PDF o formato non testuale)</p>
              </div>
            )}
          </div>

          {/* Colonna Destra: Form di Verifica */}
          <div className="space-y-6">
            <div className={`rounded-3xl border ${cardBg} p-6 shadow-sm`}>
            <h2 className="text-lg font-black mb-4 flex items-center gap-3">
              <Edit3 size={20} className="text-amber-500" /> Revisiona i Dati Estratti
            </h2>
            <p className={`text-sm mb-6 ${mutedText}`}>Verifica e correggi i dati estratti dall'OCR prima di salvare.</p>

            {error && (
              <div className="mb-4 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-sm font-bold flex items-center gap-2">
                <AlertTriangle size={16} /> {error}
              </div>
            )}

            {/* Controllo header data */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest opacity-60 mb-1 block">Data Controllo</label>
                <input value={ocrResult.controllo.data_controllo || ''} onChange={e => updateControlloField('data_controllo', e.target.value)} className={`w-full px-3 py-2 rounded-lg border text-sm font-bold ${inputBg}`} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest opacity-60 mb-1 block">Ora Inizio</label>
                  <input value={ocrResult.controllo.ora_inizio || ''} onChange={e => updateControlloField('ora_inizio', e.target.value)} className={`w-full px-3 py-2 rounded-lg border text-sm ${inputBg}`} />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest opacity-60 mb-1 block">Ora Fine</label>
                  <input value={ocrResult.controllo.ora_fine || ''} onChange={e => updateControlloField('ora_fine', e.target.value)} className={`w-full px-3 py-2 rounded-lg border text-sm ${inputBg}`} />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest opacity-60 mb-1 block">Luogo</label>
                <input value={ocrResult.controllo.luogo || ''} onChange={e => updateControlloField('luogo', e.target.value)} className={`w-full px-3 py-2 rounded-lg border text-sm ${inputBg}`} />
              </div>
            </div>
            <div className="mb-6">
              <label className="text-xs font-bold uppercase tracking-widest opacity-60 mb-1 block">Operatori</label>
              <input value={ocrResult.controllo.operatori || ''} onChange={e => updateControlloField('operatori', e.target.value)} className={`w-full px-3 py-2 rounded-lg border text-sm ${inputBg}`} />
            </div>
          </div>

          {/* Veicoli */}
          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 opacity-60">
              Veicoli estratti ({ocrResult.veicoli.length})
            </h3>

            {ocrResult.veicoli.map((v, idx) => (
              <div key={idx} className={`rounded-2xl border ${cardBg} overflow-hidden shadow-sm`}>
                {/* Vehicle summary bar */}
                <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => setExpandedVehicle(expandedVehicle === idx ? null : idx)}>
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-black tracking-widest text-blue-500">{v.targa || '???'}</span>
                    <span className={`text-sm ${mutedText}`}>{v.veicolo} {v.marca_modello ? `• ${v.marca_modello}` : ''}</span>
                    {v.sanzione_elevata && <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 text-xs font-bold rounded-lg">Sanzione</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={(e) => { e.stopPropagation(); removeVehicle(idx) }}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white transition-all">
                      <Trash2 size={14} />
                    </button>
                    {expandedVehicle === idx ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {/* Expanded editing */}
                {expandedVehicle === idx && (
                  <div className={`p-4 border-t ${isDark ? "border-white/5 bg-slate-950/30" : "border-slate-100 bg-slate-50/50"} space-y-4`}>
                    {/* Dati veicolo */}
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">Dati Veicolo</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <InputField label="Ora" value={v.ora_controllo} onChange={val => updateVehicleField(idx, 'ora_controllo', val)} inputBg={inputBg} />
                        <InputField label="Targa" value={v.targa} onChange={val => updateVehicleField(idx, 'targa', val.toUpperCase())} inputBg={inputBg} bold />
                        <InputField label="Tipo" value={v.veicolo} onChange={val => updateVehicleField(idx, 'veicolo', val)} inputBg={inputBg} />
                        <InputField label="Marca/Modello" value={v.marca_modello} onChange={val => updateVehicleField(idx, 'marca_modello', val)} inputBg={inputBg} />
                      </div>
                    </div>

                    {/* Proprietario */}
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">Proprietario</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <InputField label="Cognome" value={v.proprietario_cognome} onChange={val => updateVehicleField(idx, 'proprietario_cognome', val)} inputBg={inputBg} />
                        <InputField label="Nome" value={v.proprietario_nome} onChange={val => updateVehicleField(idx, 'proprietario_nome', val)} inputBg={inputBg} />
                        <InputField label="Data nascita" value={v.proprietario_data_nascita} onChange={val => updateVehicleField(idx, 'proprietario_data_nascita', val)} inputBg={inputBg} />
                        <InputField label="Luogo nascita" value={v.proprietario_luogo_nascita} onChange={val => updateVehicleField(idx, 'proprietario_luogo_nascita', val)} inputBg={inputBg} />
                        <InputField label="Residenza" value={v.proprietario_residenza} onChange={val => updateVehicleField(idx, 'proprietario_residenza', val)} inputBg={inputBg} />
                        <InputField label="Indirizzo" value={v.proprietario_indirizzo} onChange={val => updateVehicleField(idx, 'proprietario_indirizzo', val)} inputBg={inputBg} />
                      </div>
                    </div>

                    {/* Conducente */}
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Conducente</p>
                        <label className="flex items-center gap-1.5 text-xs font-bold">
                          <input type="checkbox" checked={!!v.conducente_stesso_prop} onChange={e => updateVehicleField(idx, 'conducente_stesso_prop', e.target.checked)} className="rounded" />
                          = Proprietario
                        </label>
                      </div>
                      {!v.conducente_stesso_prop && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          <InputField label="Cognome" value={v.conducente_cognome} onChange={val => updateVehicleField(idx, 'conducente_cognome', val)} inputBg={inputBg} />
                          <InputField label="Nome" value={v.conducente_nome} onChange={val => updateVehicleField(idx, 'conducente_nome', val)} inputBg={inputBg} />
                          <InputField label="Data nascita" value={v.conducente_data_nascita} onChange={val => updateVehicleField(idx, 'conducente_data_nascita', val)} inputBg={inputBg} />
                        </div>
                      )}
                    </div>

                    {/* Patente */}
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">Patente</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <InputField label="Numero" value={v.patente_numero} onChange={val => updateVehicleField(idx, 'patente_numero', val)} inputBg={inputBg} />
                        <InputField label="Rilasciata da" value={v.patente_rilasciata_da} onChange={val => updateVehicleField(idx, 'patente_rilasciata_da', val)} inputBg={inputBg} />
                        <InputField label="Data rilascio" value={v.patente_data_rilascio} onChange={val => updateVehicleField(idx, 'patente_data_rilascio', val)} inputBg={inputBg} />
                        <InputField label="Valida fino" value={v.patente_validita_fino} onChange={val => updateVehicleField(idx, 'patente_validita_fino', val)} inputBg={inputBg} />
                      </div>
                    </div>

                    {/* Sanzioni */}
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">Sanzioni</p>
                      <div className="grid grid-cols-2 gap-3">
                        <InputField label="Sanzione elevata" value={v.sanzione_elevata} onChange={val => updateVehicleField(idx, 'sanzione_elevata', val)} inputBg={inputBg} />
                        <InputField label="Sanzione accessoria" value={v.sanzione_accessoria} onChange={val => updateVehicleField(idx, 'sanzione_accessoria', val)} inputBg={inputBg} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex justify-between items-center bg-white dark:bg-slate-900 sticky bottom-4 p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl z-50">
            <button onClick={reset} className={`px-4 py-3 text-sm font-bold rounded-xl ${isDark ? "bg-white/5 hover:bg-white/10" : "bg-slate-100 hover:bg-slate-200"}`}>
              ← Annulla
            </button>
            <button onClick={confirmImport} disabled={!ocrResult.veicoli.length}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-600/20 active:scale-95">
              <Save size={16} /> Conferma e Salva ({ocrResult.veicoli.length} veicoli)
            </button>
          </div>
          </div>
        </div>
      )}

      {/* STEP: SAVING */}
      {step === "saving" && (
        <div className={`rounded-3xl border ${cardBg} p-12 shadow-sm text-center`}>
          <Loader2 size={32} className="text-emerald-500 animate-spin mx-auto mb-4" />
          <p className="font-bold">Salvataggio in corso...</p>
        </div>
      )}

      {/* STEP: DONE */}
      {step === "done" && saveResult && (
        <div className={`rounded-3xl border ${cardBg} p-8 shadow-sm text-center`}>
          <div className="w-16 h-16 mx-auto mb-4 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
            <CheckCircle size={32} className="text-emerald-500" />
          </div>
          <h2 className="text-lg font-black mb-2">Importazione Completata!</h2>
          <p className={`text-sm ${mutedText} mb-4`}>
            {saveResult.veicoliImportati} veicoli importati con successo.
          </p>
          {saveResult.warnings?.length > 0 && (
            <div className="mb-4 p-3 bg-amber-500/10 rounded-xl text-amber-500 text-xs font-bold text-left">
              {saveResult.warnings.map((w: string, i: number) => <p key={i}>⚠ {w}</p>)}
            </div>
          )}
          <div className="flex gap-3 justify-center">
            <button onClick={reset} className={`px-4 py-2.5 text-sm font-bold rounded-xl ${isDark ? "bg-white/5 hover:bg-white/10" : "bg-slate-100 hover:bg-slate-200"}`}>
              Importa altra scheda
            </button>
            <button onClick={onImportComplete} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl">
              Vai alla lista
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Reusable input field component
function InputField({ label, value, onChange, inputBg, bold }: {
  label: string; value?: string | null; onChange: (val: string) => void; inputBg: string; bold?: boolean
}) {
  return (
    <div>
      <label className="text-[9px] font-bold uppercase tracking-widest opacity-40 mb-0.5 block">{label}</label>
      <input value={value || ''} onChange={e => onChange(e.target.value)}
        className={`w-full px-2 py-1.5 rounded-lg border text-sm ${bold ? 'font-bold' : ''} ${inputBg}`} />
    </div>
  )
}
