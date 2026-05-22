"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Camera, MapPin, Check, ChevronLeft, AlertTriangle } from "lucide-react"

export default function NuovoVerbalePage() {
  const router = useRouter()
  const { tenantSlug } = useParams<{ tenantSlug: string }>()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  const [formData, setFormData] = useState({
    targa: "",
    tipoInfrazione: "DIVIETO_SOSTA",
    articoloCDS: "Art. 158",
    importo: "",
    note: "",
    lat: null as number | null,
    lng: null as number | null,
    indirizzo: ""
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
          importo: parseFloat(formData.importo)
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
        <div className="w-24 h-24 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mb-6">
          <Check size={48} />
        </div>
        <h1 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Verbale Emesso</h1>
        <p className="text-slate-400">Il verbale è stato registrato a sistema.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-24">
      {/* App Bar */}
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-white/5 p-4 flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 bg-white/5 rounded-xl text-white/70">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-sm font-black uppercase tracking-widest">Nuovo Verbale</h1>
          <p className="text-[10px] text-blue-400 font-bold">Codice della Strada</p>
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto">
        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl mb-6 flex items-start gap-3 text-sm font-medium">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Targa */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Targa Veicolo</label>
            <input 
              type="text" 
              required
              value={formData.targa}
              onChange={e => setFormData({...formData, targa: e.target.value.toUpperCase()})}
              className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-xl font-black text-center uppercase focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
              placeholder="AB123CD"
            />
          </div>

          {/* Tipo Infrazione */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tipo Infrazione</label>
            <select 
              value={formData.tipoInfrazione}
              onChange={e => setFormData({...formData, tipoInfrazione: e.target.value})}
              className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
            >
              <option value="DIVIETO_SOSTA">Divieto di Sosta</option>
              <option value="ZTL">Accesso ZTL Non Autorizzato</option>
              <option value="VELOCITA">Eccesso di Velocità</option>
              <option value="CINTURE">Mancato uso Cinture di Sicurezza</option>
              <option value="TELEFONO">Uso Smartphone alla guida</option>
              <option value="ALTRO">Altro (Specificare in note)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Articolo CDS */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Art. CDS</label>
              <input 
                type="text" 
                required
                value={formData.articoloCDS}
                onChange={e => setFormData({...formData, articoloCDS: e.target.value})}
                className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="es. 158"
              />
            </div>

            {/* Importo */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Importo (€)</label>
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
          </div>

          {/* Posizione (Read-only for now) */}
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
                  {formData.lat ? "Precisione Alta" : "In attesa"}
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

          {/* Fotografia (Mockup for now) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Prova Fotografica</label>
            <button type="button" className="w-full p-6 border-2 border-dashed border-white/10 hover:border-blue-500/50 hover:bg-blue-500/5 rounded-3xl flex flex-col items-center justify-center gap-3 transition-colors text-slate-400 hover:text-blue-400">
              <Camera size={32} />
              <span className="text-xs font-bold uppercase tracking-widest">Scatta Foto</span>
            </button>
          </div>

          {/* Note */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Note (Opzionale)</label>
            <textarea 
              value={formData.note}
              onChange={e => setFormData({...formData, note: e.target.value})}
              className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px] resize-none"
              placeholder="Dettagli aggiuntivi..."
            />
          </div>

          {/* Submit */}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full p-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-blue-900/40 transition-all disabled:opacity-50 disabled:hover:bg-blue-600"
          >
            {loading ? "Emissione in corso..." : "Emetti Verbale"}
          </button>
        </form>
      </main>
    </div>
  )
}
