"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Shield, MapPin, CheckCircle, Navigation as NavIcon, Clock, ThumbsUp, ThumbsDown, HelpCircle, X, Map } from "lucide-react"
import toast from "react-hot-toast"

const NAV_STORAGE_KEY = "preferred_nav_app"

type NavApp = "google" | "apple" | "waze"

const NAV_APPS: { id: NavApp; label: string; icon: string; description: string }[] = [
  { id: "google", label: "Google Maps", icon: "🗺️", description: "Disponibile su tutti i dispositivi" },
  { id: "apple", label: "Mappe Apple", icon: "🍎", description: "Per dispositivi iPhone / iPad" },
  { id: "waze", label: "Waze", icon: "📍", description: "Navigazione con traffico in tempo reale" },
]

function getNavUrl(app: NavApp, address: string): string {
  const encoded = encodeURIComponent(address)
  switch (app) {
    case "google":
      return `https://www.google.com/maps/dir/?api=1&destination=${encoded}`
    case "apple":
      return `https://maps.apple.com/?daddr=${encoded}`
    case "waze":
      return `https://waze.com/ul?q=${encoded}&navigate=yes`
  }
}

export default function AgentInterventions() {
  const { data: session } = useSession()
  const [interventions, setInterventions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showOutcomeFor, setShowOutcomeFor] = useState<string | null>(null)
  const [outcomeNotes, setOutcomeNotes] = useState("")
  const [showNavPicker, setShowNavPicker] = useState<{ address: string } | null>(null)
  const [preferredNav, setPreferredNav] = useState<NavApp | null>(null)

  // Load saved preference on mount
  useEffect(() => {
    const saved = localStorage.getItem(NAV_STORAGE_KEY) as NavApp | null
    if (saved && ["google", "apple", "waze"].includes(saved)) {
      setPreferredNav(saved)
    }
  }, [])

  const fetchInterventions = async () => {
    try {
      const res = await fetch("/api/agent/interventions")
      if (res.ok) setInterventions(await res.json())
    } catch (error) { console.error("Fetch interventions error", error) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    fetchInterventions()
    const interval = setInterval(fetchInterventions, 10000)
    return () => clearInterval(interval)
  }, [])

  const updateStatus = async (id: string, action: string, outcome?: string) => {
    try {
      const res = await fetch("/api/agent/interventions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, outcome, outcomeNotes: outcome ? outcomeNotes : undefined })
      })
      if (res.ok) {
        toast.success("Stato aggiornato")
        setShowOutcomeFor(null)
        setOutcomeNotes("")
        fetchInterventions()
      } else { toast.error("Impossibile aggiornare lo stato") }
    } catch { toast.error("Errore di rete") }
  }

  const openNavigation = useCallback((app: NavApp, address: string) => {
    const url = getNavUrl(app, address)
    window.location.href = url
  }, [])

  const handleNavigate = useCallback((address: string) => {
    if (preferredNav) {
      openNavigation(preferredNav, address)
    } else {
      setShowNavPicker({ address })
    }
  }, [preferredNav, openNavigation])

  const selectNavApp = useCallback((app: NavApp, remember: boolean) => {
    if (remember) {
      localStorage.setItem(NAV_STORAGE_KEY, app)
      setPreferredNav(app)
    }
    if (showNavPicker) {
      openNavigation(app, showNavPicker.address)
    }
    setShowNavPicker(null)
  }, [showNavPicker, openNavigation])

  const resetNavPreference = useCallback(() => {
    localStorage.removeItem(NAV_STORAGE_KEY)
    setPreferredNav(null)
    toast.success("Preferenza navigazione rimossa")
  }, [])

  if (loading) return <div className="p-4 text-center">Caricamento...</div>

  const activeInterventions = interventions.filter(i => i.status !== 'COMPLETED' && i.status !== 'CANCELED')
  const historyInterventions = interventions.filter(i => i.status === 'COMPLETED' || i.status === 'CANCELED')

  return (
    <div className="p-4 pb-24 space-y-4">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="w-6 h-6 text-blue-600" />
        <h1 className="text-xl font-bold text-slate-800">Missioni Assegnate</h1>
      </div>

      {activeInterventions.length === 0 ? (
        <div className="text-center p-8 bg-gray-50 rounded-xl border border-gray-100 mb-6">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nessun intervento attivo</p>
          <p className="text-sm text-gray-400">La centrale non ha inviato missioni.</p>
        </div>
      ) : (
        <div className="space-y-4 mb-8">
          {activeInterventions.map(i => (
          <div key={i.id} className={`bg-white rounded-xl shadow-md overflow-hidden border-t-4 ${i.priority === 'RED' ? 'border-red-500' : i.priority === 'YELLOW' ? 'border-yellow-500' : 'border-green-500'}`}>
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h2 className="font-bold text-lg text-slate-800">{i.type}</h2>
                <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${
                  i.priority === 'RED' ? 'bg-red-100 text-red-700 animate-pulse' : 
                  i.priority === 'YELLOW' ? 'bg-yellow-100 text-yellow-700' : 
                  'bg-green-100 text-green-700'
                }`}>
                  {i.priority === 'RED' ? 'Emergenza' : i.priority === 'YELLOW' ? 'Urgente' : 'Ordinario'}
                </span>
              </div>
              
              <div className="flex items-start gap-2 text-gray-600 mt-3">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" />
                <p className="text-sm">{i.address}</p>
              </div>

              {i.description && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-700 border border-gray-100">
                  {i.description}
                </div>
              )}

              <div className="mt-4 pt-4 border-t flex flex-col gap-2">
                {i.status === 'DISPATCHED' && (
                  <button onClick={() => updateStatus(i.id, 'ACCEPT')} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200">
                    <CheckCircle className="w-5 h-5" /> Accetta Missione
                  </button>
                )}

                {i.status === 'ACCEPTED' && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => i.address && handleNavigate(i.address)} className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center gap-2">
                        <NavIcon className="w-5 h-5" /> Naviga
                      </button>
                      <button onClick={() => updateStatus(i.id, 'ARRIVE')} className="w-full py-3 bg-yellow-500 text-white rounded-xl font-bold flex items-center justify-center gap-2">
                        <MapPin className="w-5 h-5" /> Sul Posto
                      </button>
                    </div>
                    {preferredNav && (
                      <button onClick={resetNavPreference} className="text-[10px] text-blue-500 underline text-center mt-1">
                        Navigazione: {NAV_APPS.find(a => a.id === preferredNav)?.label} — cambia app
                      </button>
                    )}
                  </>
                )}

                {i.status === 'ON_SITE' && showOutcomeFor !== i.id && (
                  <button onClick={() => setShowOutcomeFor(i.id)} className="w-full py-3 bg-green-500 text-white rounded-xl font-bold flex items-center justify-center gap-2">
                    <CheckCircle className="w-5 h-5" /> Chiudi Intervento
                  </button>
                )}

                {/* Form Esito Intervento */}
                {i.status === 'ON_SITE' && showOutcomeFor === i.id && (
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-3">
                    <p className="text-sm font-bold text-slate-700">Esito dell'intervento:</p>
                    <div className="grid grid-cols-3 gap-2">
                      <button onClick={() => updateStatus(i.id, 'COMPLETE', 'POSITIVO')} 
                        className="py-3 bg-green-500 text-white rounded-xl font-bold flex flex-col items-center gap-1 text-xs">
                        <ThumbsUp className="w-5 h-5" /> Positivo
                      </button>
                      <button onClick={() => updateStatus(i.id, 'COMPLETE', 'NEGATIVO')} 
                        className="py-3 bg-red-500 text-white rounded-xl font-bold flex flex-col items-center gap-1 text-xs">
                        <ThumbsDown className="w-5 h-5" /> Negativo
                      </button>
                      <button onClick={() => updateStatus(i.id, 'COMPLETE', 'INFONDATO')} 
                        className="py-3 bg-gray-500 text-white rounded-xl font-bold flex flex-col items-center gap-1 text-xs">
                        <HelpCircle className="w-5 h-5" /> Infondato
                      </button>
                    </div>
                    <textarea value={outcomeNotes} onChange={e => setOutcomeNotes(e.target.value)}
                      className="w-full border rounded-lg p-2 text-sm" rows={2}
                      placeholder="Note sull'esito (opzionale)..." />
                    <button onClick={() => setShowOutcomeFor(null)} className="w-full text-xs text-gray-500 py-1">Annulla</button>
                  </div>
                )}
              </div>
            </div>
          </div>
          ))}
        </div>
      )}

      {historyInterventions.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-500" /> Storico Odierno
          </h2>
          <div className="space-y-3">
            {historyInterventions.map(i => (
              <div key={i.id} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-slate-700 text-sm">{i.type}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    i.outcome === 'POSITIVO' ? 'bg-green-100 text-green-700' :
                    i.outcome === 'NEGATIVO' ? 'bg-red-100 text-red-700' :
                    'bg-gray-200 text-gray-700'
                  }`}>
                    {i.outcome || 'CHIUSO'}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-slate-500 text-xs mb-2">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <p className="truncate">{i.address}</p>
                </div>
                {i.outcomeNotes && (
                  <p className="text-xs text-slate-600 bg-white p-2 rounded border border-slate-100 italic">
                    Note: {i.outcomeNotes}
                  </p>
                )}
                <p className="text-[10px] text-slate-400 mt-2 text-right">
                  Chiuso alle {i.completedAt ? new Date(i.completedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : new Date(i.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation App Picker Modal */}
      {showNavPicker && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowNavPicker(null)}>
          <div className="w-full max-w-md bg-white rounded-t-3xl p-6 pb-10 shadow-2xl animate-[slideUp_0.3s_ease-out]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Map className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold text-slate-800">Apri con...</h3>
              </div>
              <button onClick={() => setShowNavPicker(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-3">
              {NAV_APPS.map(app => (
                <button key={app.id} onClick={() => selectNavApp(app.id, true)}
                  className="w-full flex items-center gap-4 p-4 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-2xl transition-all active:scale-[0.98]">
                  <span className="text-3xl">{app.icon}</span>
                  <div className="text-left">
                    <p className="font-bold text-slate-800">{app.label}</p>
                    <p className="text-xs text-gray-500">{app.description}</p>
                  </div>
                  <NavIcon className="w-5 h-5 text-gray-400 ml-auto" />
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 text-center mt-4">La tua scelta verrà memorizzata per le prossime volte</p>
          </div>
        </div>
      )}
    </div>
  )
}
