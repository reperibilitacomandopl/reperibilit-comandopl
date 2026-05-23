'use client'

import { useEffect, useState, Suspense, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, MapPinOff, Loader2, MapPin, AlertTriangle, LogIn } from 'lucide-react'
import { ClockOutModal } from '@/components/ClockOutModal'

// Helper: redirect to dashboard (funziona anche su iOS/mobile)
function goToDashboard() {
  fetch('/api/auth/session', { credentials: 'include' })
    .then(r => r.ok ? r.json() : null)
    .then(session => {
      const base = window.location.origin
      if (session?.user?.tenantSlug) {
        const slug = session.user.tenantSlug
        const dest = session.user.role === 'ADMIN' ? `/${slug}/admin` : `/${slug}`
        window.location.replace(base + dest)
      } else {
        // Senza sessione, vai alla landing page
        window.location.replace(base + '/')
      }
    })
    .catch(() => {
      window.location.replace(window.location.origin + '/')
    })
}

function NFCClockContent() {
  const router = useRouter()
  const hasExecuted = useRef(false)

  const [status, setStatus] = useState<'checking_auth' | 'acquiring_gps' | 'loading' | 'success' | 'error' | 'justification_required' | 'no_session'>('checking_auth')
  const [message, setMessage] = useState('Verifica autenticazione...')

  // Anomaly State
  const [anomalyData, setAnomalyData] = useState<any>(null)

  const handleClockIn = async (lat: number, lng: number, accuracy: number, overtimeReason?: string, shiftId?: string, isCorrection?: boolean, actualEndTimeStr?: string, actualStartTimeStr?: string) => {
    setStatus('loading')
    setMessage('Verifica e registrazione in corso...')

    try {
      const res = await fetch('/api/admin/clock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'AUTO',
          lat,
          lng,
          accuracy,
          isManual: false,
          checkAnomaly: !overtimeReason && !isCorrection,
          overtimeReason,
          shiftId,
          isCorrection,
          actualEndTimeStr: actualEndTimeStr || actualStartTimeStr
        })
      })

      const data = await res.json()

      if (res.status === 428 && data.requiresJustification) {
        setAnomalyData({
           shiftId: data.shiftId,
           anomalyType: data.anomalyType,
           diffMins: data.diffMins,
           plannedTime: data.plannedTime,
           lat, lng, accuracy
        })
        setStatus('justification_required')
        setMessage('Richiesta Giustificazione')
        return
      }

      if (res.ok) {
        setStatus('success')
        const actionType = data.record?.type === 'IN' ? 'Entrata' : 'Uscita'
        setMessage(`Timbratura di ${actionType} registrata con successo!`)
      } else {
        setStatus('error')
        if (res.status === 401) {
            setMessage('Sessione scaduta. Effettua nuovamente il login nell\'app Sentinel, poi riprova il tag NFC.')
        } else if (res.status === 403 && data.distance) {
            setMessage(`Troppo lontano dalla sede! Distanza: ${data.distance}m (limite: ${data.allowed}m)`)
        } else if (data.error) {
            setMessage(data.error)
        } else {
            setMessage('Si è verificato un problema durante la timbratura. Riprova.')
        }
      }
    } catch (err) {
      setStatus('error')
      setMessage('Impossibile connettersi al server. Verifica la connessione internet e riprova.')
    }
  }

  // Step 0: Verifica autenticazione prima di tutto
  useEffect(() => {
    if (hasExecuted.current) return
    hasExecuted.current = true

    // Prima verifica che l'utente sia autenticato
    fetch('/api/auth/session', { credentials: 'include' })
      .then(r => r.json())
      .then(session => {
        if (!session?.user?.id) {
          setStatus('no_session')
          setMessage('Nessuna sessione attiva.')
          return
        }

        // Utente autenticato, procedi con GPS
        setStatus('acquiring_gps')
        setMessage('Acquisizione posizione GPS...')

        if (!navigator.geolocation) {
          setStatus('error')
          setMessage('Geolocalizzazione non supportata dal tuo browser.')
          return
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            handleClockIn(position.coords.latitude, position.coords.longitude, position.coords.accuracy)
          },
          (error) => {
            setStatus('error')
            switch(error.code) {
              case error.PERMISSION_DENIED:
                setMessage('Permesso GPS negato. Consenti l\'accesso alla posizione per timbrare tramite NFC.')
                break
              case error.POSITION_UNAVAILABLE:
                setMessage('Posizione non disponibile. Riprova.')
                break
              case error.TIMEOUT:
                setMessage('Timeout GPS. Avvicinati a una finestra o esci all\'aperto e riprova.')
                break
              default:
                setMessage('Errore durante l\'acquisizione della posizione GPS.')
                break
            }
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        )
      })
      .catch(() => {
        setStatus('error')
        setMessage('Impossibile verificare la sessione. Controlla la connessione.')
      })
  }, [])

  useEffect(() => {
    if (hasExecuted.current) return
    hasExecuted.current = true

    if (!navigator.geolocation) {
      setStatus('error')
      setMessage('Geolocalizzazione non supportata dal tuo browser.')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        handleClockIn(position.coords.latitude, position.coords.longitude, position.coords.accuracy)
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

  useEffect(() => {
    if (status === 'success') {
      const timer = setTimeout(() => {
        goToDashboard()
      }, 2500)
      return () => clearTimeout(timer)
    }
  }, [status])

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
        {(status === 'checking_auth' || status === 'acquiring_gps' || status === 'loading') && (
          <div className="flex flex-col items-center my-6">
            <Loader2 className="h-16 w-16 text-blue-500 animate-spin mb-4" />
            <p className="text-slate-300 font-medium text-lg">{message}</p>
            {status === 'acquiring_gps' && (
                <p className="text-slate-500 text-sm mt-2">Assicurati di aver concesso i permessi GPS al browser.</p>
            )}
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center my-6 animate-in fade-in zoom-in duration-300">
            <div className="bg-green-500/20 p-5 rounded-full mb-4 ring-4 ring-green-500/10">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
            <h1 className="text-3xl font-bold mb-2 text-green-400">Confermato!</h1>
            <p className="text-slate-300 text-lg mb-2 text-center px-4">{message}</p>
            <p className="text-slate-500 text-sm mb-8 text-center px-4">Reindirizzamento alla Dashboard in corso...</p>
            <div className="flex gap-3">
              <button
                onClick={goToDashboard}
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-semibold transition-all"
              >
                Vai alla Dashboard
              </button>
            </div>
          </div>
        )}

        {status === 'no_session' && (
          <div className="flex flex-col items-center my-6 animate-in fade-in zoom-in duration-300">
            <div className="bg-amber-500/20 p-5 rounded-full mb-4 ring-4 ring-amber-500/10">
              <LogIn className="h-16 w-16 text-amber-400" />
            </div>
            <h1 className="text-2xl font-bold mb-2 text-amber-400">Accesso Richiesto</h1>
            <p className="text-slate-300 mb-4 text-center px-4">Su iPhone il tag NFC apre una finestra separata. Devi prima aver fatto login nell&apos;app.</p>
            <div className="bg-slate-700/50 rounded-2xl p-4 mb-6 text-left text-sm text-slate-400 space-y-2 w-full">
              <p className="font-bold text-white text-center mb-2">🔧 Come risolvere:</p>
              <p>1. Apri <b>Safari</b> e vai su <b>gestionepolizialocale.it</b></p>
              <p>2. Fai login con le tue credenziali</p>
              <p className="text-amber-300">3. TORNA QUI e ricarica la pagina</p>
              <p className="text-xs text-slate-500 mt-2">💡 Dopo il login, aggiungi l&apos;app alla Home per non rifare questa procedura.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => window.location.reload()} className="bg-amber-600 hover:bg-amber-500 text-white px-6 py-3 rounded-xl font-semibold transition-all">
                Ho fatto il Login — Ricarica
              </button>
              <a href="/login" className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-xl font-semibold transition-all inline-block">
                Vai al Login
              </a>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center my-6 animate-in fade-in zoom-in duration-300">
            <div className="bg-red-500/20 p-5 rounded-full mb-4 ring-4 ring-red-500/10">
              <MapPinOff className="h-16 w-16 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold mb-2 text-red-400">Operazione Negata</h1>
            <p className="text-slate-300 mb-8 text-center px-4">{message}</p>
            <div className="flex gap-3">
                <button
                onClick={() => window.location.reload()}
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-semibold transition-all"
                >
                Riprova
                </button>
                <button
                onClick={goToDashboard}
                className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-xl font-semibold transition-all"
                >
                Dashboard
                </button>
            </div>
          </div>
        )}
      </div>

      {status === 'justification_required' && anomalyData && (
        <ClockOutModal 
          type={anomalyData.anomalyType}
          diffMins={anomalyData.diffMins}
          plannedEndTime={anomalyData.plannedTime}
          onConfirm={(data) => {
            const overtimeReason = `${data.code} ${data.notes}`
            const isLateIn = anomalyData.anomalyType === "LATE_IN"
            handleClockIn(
              anomalyData.lat, 
              anomalyData.lng, 
              anomalyData.accuracy, 
              overtimeReason, 
              anomalyData.shiftId,
              false,
              isLateIn ? data.actualStartTimeStr : data.actualEndTimeStr
            )
          }}
          onCancel={() => {
            setStatus('error')
            setMessage("Operazione annullata dall'utente.")
          }}
          onCorrectionOnly={anomalyData.anomalyType === "OVERTIME" ? () => {
            handleClockIn(
              anomalyData.lat, 
              anomalyData.lng, 
              anomalyData.accuracy, 
              undefined, 
              anomalyData.shiftId,
              true, 
              anomalyData.plannedTime
            )
          } : undefined}
        />
      )}
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
