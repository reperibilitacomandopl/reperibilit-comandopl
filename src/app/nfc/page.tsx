'use client'

import { useEffect, useState, Suspense, useRef, useCallback } from 'react'
import { CheckCircle2, MapPinOff, Loader2, LogIn, Fingerprint } from 'lucide-react'
import { ClockOutModal } from '@/components/ClockOutModal'
import {
  acquireGpsPosition,
  postNfcStyleClock,
  gpsErrorMessage,
  type NfcJustificationPayload,
} from '@/lib/agent-nfc-clock'

function NFCClockContent() {
  const hasCheckedAuth = useRef(false)
  const tenantSlugRef = useRef<string | null>(null)
  const roleRef = useRef<string | null>(null)

  const [status, setStatus] = useState<
    | 'checking_auth'
    | 'acquiring_gps'
    | 'loading'
    | 'success'
    | 'error'
    | 'justification_required'
    | 'no_session'
  >('checking_auth')
  const [message, setMessage] = useState('Verifica autenticazione...')
  const [userName, setUserName] = useState<string | null>(null)
  const [anomalyData, setAnomalyData] = useState<NfcJustificationPayload | null>(null)

  function goToDashboard() {
    const base = window.location.origin
    if (tenantSlugRef.current) {
      const dest =
        roleRef.current === 'ADMIN'
          ? `/${tenantSlugRef.current}/admin`
          : `/${tenantSlugRef.current}`
      window.location.href = base + dest
    } else {
      window.location.href = base + '/'
    }
  }

  const runClock = useCallback(
    async (gps: { lat: number; lng: number; accuracy: number }, extra?: {
      overtimeReason?: string
      shiftId?: string
      isCorrection?: boolean
      actualEndTimeStr?: string
    }) => {
      setStatus('loading')
      setMessage('Verifica e registrazione in corso...')

      const result = await postNfcStyleClock({
        type: 'AUTO',
        ...gps,
        checkAnomaly: !extra?.overtimeReason && !extra?.isCorrection,
        ...extra,
      })

      if (!result.ok && 'needsJustification' in result && result.needsJustification) {
        setAnomalyData(result.data)
        setStatus('justification_required')
        setMessage('Richiesta Giustificazione')
        return
      }

      if (result.ok) {
        setStatus('success')
        setMessage(result.message)
        return
      }

      if ('needsJustification' in result) {
        return
      }

      setStatus('error')
      setMessage(result.message)
    },
    []
  )

  const startGpsAndClock = useCallback(async () => {
    setStatus('acquiring_gps')
    setMessage('Acquisizione posizione GPS...')
    try {
      const gps = await acquireGpsPosition()
      await runClock(gps)
    } catch (err) {
      setStatus('error')
      setMessage(gpsErrorMessage(err as GeolocationPositionError))
    }
  }, [runClock])

  useEffect(() => {
    if (hasCheckedAuth.current) return
    hasCheckedAuth.current = true

    fetch('/api/auth/session', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((session) => {
        if (!session?.user?.id) {
          setStatus('no_session')
          setMessage('Nessuna sessione attiva.')
          return
        }
        tenantSlugRef.current = session.user.tenantSlug || null
        roleRef.current = session.user.role || null
        setUserName(session.user.name || session.user.matricola || 'Operatore')
        startGpsAndClock()
      })
      .catch(() => {
        setStatus('error')
        setMessage('Impossibile verificare la sessione. Controlla la connessione.')
      })
  }, [startGpsAndClock])

  useEffect(() => {
    if (status === 'success') {
      const timer = setTimeout(() => goToDashboard(), 4000)
      return () => clearTimeout(timer)
    }
  }, [status])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-6 font-sans">
      <div className="bg-slate-800 p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-md w-full text-center border border-slate-700">
        <div className="mb-8 w-full flex flex-col items-center">
          <div className="bg-blue-500/20 p-3 rounded-full mb-3">
            <Fingerprint className="h-8 w-8 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Timbratura NFC</h1>
          <p className="text-slate-400 text-sm mt-1 font-medium">Badge automatico — avvicina e vai</p>
        </div>

        {(status === 'checking_auth' || status === 'acquiring_gps' || status === 'loading') && (
          <div className="flex flex-col items-center my-6">
            <Loader2 className="h-16 w-16 text-blue-500 animate-spin mb-4" />
            <p className="text-slate-300 font-medium text-lg">{message}</p>
            {userName && <p className="text-slate-500 text-sm mt-2">{userName}</p>}
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center my-6 animate-in fade-in zoom-in duration-300">
            <div className="bg-green-500/20 p-5 rounded-full mb-4 ring-4 ring-green-500/10">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
            <h2 className="text-3xl font-bold mb-2 text-green-400">Confermato!</h2>
            <p className="text-slate-300 text-lg mb-2 text-center px-4">{message}</p>
            <button
              onClick={goToDashboard}
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-semibold transition-all"
            >
              Vai alla Dashboard
            </button>
          </div>
        )}

        {status === 'no_session' && (
          <div className="flex flex-col items-center my-6">
            <LogIn className="h-16 w-16 text-amber-400 mb-4" />
            <h2 className="text-2xl font-bold mb-2 text-amber-400">Accesso Richiesto</h2>
            <p className="text-slate-300 mb-4 text-center px-4">
              Su iPhone il tag NFC apre una finestra separata. Devi prima aver fatto login nell&apos;app.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-amber-600 hover:bg-amber-500 text-white px-6 py-3 rounded-xl font-semibold"
            >
              Ho fatto il Login — Ricarica
            </button>
            <a href="/login" className="mt-3 text-blue-400 text-sm font-bold">
              Vai al Login
            </a>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center my-6">
            <MapPinOff className="h-16 w-16 text-red-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2 text-red-400">Operazione Negata</h2>
            <p className="text-slate-300 mb-8 text-center px-4 whitespace-pre-line">{message}</p>
            <div className="flex gap-3">
              <button
                onClick={() => void startGpsAndClock()}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold"
              >
                Riprova
              </button>
              <button onClick={goToDashboard} className="bg-slate-700 text-white px-6 py-3 rounded-xl font-semibold">
                Dashboard
              </button>
            </div>
          </div>
        )}
      </div>

      {status === 'justification_required' && anomalyData && (
        <ClockOutModal
          type={anomalyData.anomalyType as "LATE_IN" | "OVERTIME" | "EARLY_EXIT"}
          diffMins={anomalyData.diffMins}
          plannedEndTime={anomalyData.plannedTime}
          onConfirm={(data) => {
            const overtimeReason = `${data.code} ${data.notes}`
            const isLateIn = anomalyData.anomalyType === 'LATE_IN'
            void runClock(
              {
                lat: anomalyData.lat,
                lng: anomalyData.lng,
                accuracy: anomalyData.accuracy,
              },
              {
                overtimeReason,
                shiftId: anomalyData.shiftId,
                actualEndTimeStr: isLateIn ? data.actualStartTimeStr : data.actualEndTimeStr,
              }
            )
          }}
          onCancel={() => {
            setStatus('error')
            setMessage("Operazione annullata dall'utente.")
            setAnomalyData(null)
          }}
          onCorrectionOnly={
            anomalyData.anomalyType === 'OVERTIME'
              ? () => {
                  void runClock(
                    {
                      lat: anomalyData.lat,
                      lng: anomalyData.lng,
                      accuracy: anomalyData.accuracy,
                    },
                    {
                      shiftId: anomalyData.shiftId,
                      isCorrection: true,
                      actualEndTimeStr: anomalyData.plannedTime,
                    }
                  )
                }
              : undefined
          }
        />
      )}
    </div>
  )
}

export default function NFCClockPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white">
          <Loader2 className="animate-spin text-blue-500 h-12 w-12 mb-4" />
          <p className="font-medium text-slate-400">Inizializzazione NFC...</p>
        </div>
      }
    >
      <NFCClockContent />
    </Suspense>
  )
}
