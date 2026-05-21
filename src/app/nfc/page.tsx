'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, XCircle, Loader2, MapPin, MapPinOff, LogIn, LogOut } from 'lucide-react'

function NFCClockContent() {
  const router = useRouter()
  
  const [status, setStatus] = useState<'acquiring_gps' | 'ready' | 'loading' | 'success' | 'error'>('acquiring_gps')
  const [message, setMessage] = useState('Acquisizione posizione GPS in corso...')
  const [location, setLocation] = useState<{lat: number, lng: number, accuracy: number} | null>(null)

  useEffect(() => {
    if (!navigator.geolocation) {
      setStatus('error')
      setMessage('Geolocalizzazione non supportata dal tuo browser.')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        })
        setStatus('ready')
        setMessage('Posizione acquisita. Seleziona il tipo di timbratura.')
      },
      (error) => {
        setStatus('error')
        switch(error.code) {
          case error.PERMISSION_DENIED:
            setMessage('Permesso GPS negato. Devi consentire l\'accesso alla posizione per timbrare tramite NFC.')
            break
          case error.POSITION_UNAVAILABLE:
            setMessage('Informazioni sulla posizione non disponibili.')
            break
          case error.TIMEOUT:
            setMessage('Timeout durante la richiesta della posizione GPS.')
            break
          default:
            setMessage('Errore sconosciuto durante l\'acquisizione della posizione.')
            break
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  }, [])

  const handleClockIn = async (type: 'IN' | 'OUT') => {
    if (!location) return

    setStatus('loading')
    setMessage('Registrazione in corso...')

    try {
      const res = await fetch('/api/admin/clock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type, 
          lat: location.lat, 
          lng: location.lng, 
          accuracy: location.accuracy, 
          isManual: false 
        })
      })

      const data = await res.json()

      if (res.ok) {
        setStatus('success')
        setMessage(`Timbratura ${type === 'IN' ? 'Entrata' : 'Uscita'} registrata con successo!`)
        // Torna alla home dopo 3 secondi
        setTimeout(() => router.push('/'), 3000)
      } else {
        setStatus('error')
        if (res.status === 403 && data.distance) {
            setMessage(`Sei troppo lontano dalla sede! (Distanza rilevata: ${data.distance}m. Limite: ${data.allowed}m)`)
        } else {
            setMessage(data.error || 'Errore durante la timbratura.')
        }
      }
    } catch (err) {
      setStatus('error')
      setMessage('Errore di connessione al server.')
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-6 font-sans">
      <div className="bg-slate-800 p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-md w-full text-center border border-slate-700">
        
        {/* Intestazione */}
        <div className="mb-8 w-full flex flex-col items-center">
            <div className="bg-blue-500/20 p-3 rounded-full mb-3">
                <MapPin className="h-8 w-8 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Punto di Controllo NFC</h1>
            <p className="text-slate-400 text-sm mt-1 font-medium">Autenticazione Presenza Sicura</p>
        </div>

        {/* Stati */}
        {(status === 'acquiring_gps' || status === 'loading') && (
          <div className="flex flex-col items-center my-6">
            <Loader2 className="h-16 w-16 text-blue-500 animate-spin mb-4" />
            <p className="text-slate-300 font-medium text-lg">{message}</p>
            {status === 'acquiring_gps' && (
                <p className="text-slate-500 text-sm mt-2">Assicurati di aver concesso i permessi GPS al browser.</p>
            )}
          </div>
        )}

        {status === 'ready' && location && (
          <div className="w-full flex flex-col items-center animate-in fade-in zoom-in duration-300">
            <div className="bg-slate-900/50 rounded-2xl p-4 mb-8 w-full border border-slate-700/50">
                <p className="text-green-400 text-sm font-semibold flex items-center justify-center gap-2 mb-1">
                    <CheckCircle2 className="h-4 w-4" /> Posizione Verificata
                </p>
                <p className="text-slate-400 text-xs">Accuratezza GPS: ~{Math.round(location.accuracy)}m</p>
            </div>
            
            <div className="flex flex-col w-full gap-4">
                <button 
                  onClick={() => handleClockIn('IN')}
                  className="group relative w-full flex items-center justify-center gap-3 bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 active:scale-[0.98] transition-all text-white px-6 py-5 rounded-2xl font-bold text-lg shadow-lg shadow-blue-500/20"
                >
                  <LogIn className="h-6 w-6" />
                  REGISTRA ENTRATA
                </button>
                
                <button 
                  onClick={() => handleClockIn('OUT')}
                  className="group relative w-full flex items-center justify-center gap-3 bg-gradient-to-b from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 active:scale-[0.98] transition-all text-white px-6 py-5 rounded-2xl font-bold text-lg shadow-lg border border-slate-600"
                >
                  <LogOut className="h-6 w-6" />
                  REGISTRA USCITA
                </button>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center my-6 animate-in fade-in zoom-in duration-300">
            <div className="bg-green-500/20 p-5 rounded-full mb-4 ring-4 ring-green-500/10">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
            <h1 className="text-3xl font-bold mb-2 text-green-400">Confermato!</h1>
            <p className="text-slate-300 text-lg mb-8">{message}</p>
            <button 
              onClick={() => router.push('/')}
              className="bg-slate-700 hover:bg-slate-600 text-white px-8 py-3 rounded-xl font-semibold transition-all"
            >
              Torna alla Dashboard
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center my-6 animate-in fade-in zoom-in duration-300">
            <div className="bg-red-500/20 p-5 rounded-full mb-4 ring-4 ring-red-500/10">
              <MapPinOff className="h-16 w-16 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold mb-2 text-red-400">Operazione Negata</h1>
            <p className="text-slate-300 mb-8">{message}</p>
            <div className="flex gap-3">
                <button 
                onClick={() => window.location.reload()}
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-semibold transition-all"
                >
                Riprova
                </button>
                <button 
                onClick={() => router.push('/')}
                className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-xl font-semibold transition-all"
                >
                Dashboard
                </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function NFCClockPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white">
        <Loader2 className="animate-spin text-blue-500 h-12 w-12 mb-4" /> 
        <p className="font-medium text-slate-400">Inizializzazione NFC...</p>
      </div>
    }>
      <NFCClockContent />
    </Suspense>
  )
}
