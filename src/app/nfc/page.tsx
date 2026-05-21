'use client'

import { useEffect, useState, Suspense, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, MapPinOff, Loader2, MapPin, AlertTriangle } from 'lucide-react'
import { AGENDA_CATEGORIES } from '@/utils/agenda-codes'

function NFCClockContent() {
  const router = useRouter()
  const hasExecuted = useRef(false)
  
  const [status, setStatus] = useState<'acquiring_gps' | 'loading' | 'success' | 'error' | 'justification_required'>('acquiring_gps')
  const [message, setMessage] = useState('Acquisizione posizione GPS in corso...')
  
  // Anomaly State
  const [anomalyData, setAnomalyData] = useState<any>(null)
  const [justificationCode, setJustificationCode] = useState('0008')
  const [justificationNotes, setJustificationNotes] = useState('')

  const handleClockIn = async (lat: number, lng: number, accuracy: number, overtimeReason?: string, shiftId?: string) => {
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
          checkAnomaly: !overtimeReason,
          overtimeReason,
          shiftId
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

  const submitJustification = () => {
    if (!anomalyData) return
    handleClockIn(
      anomalyData.lat, 
      anomalyData.lng, 
      anomalyData.accuracy, 
      `${justificationCode} ${justificationNotes}`, 
      anomalyData.shiftId
    )
  }

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

        {status === 'justification_required' && anomalyData && (
          <div className="flex flex-col items-center w-full animate-in fade-in zoom-in duration-300 text-left">
            <div className="bg-amber-500/20 p-4 rounded-full mb-4 ring-4 ring-amber-500/10">
              <AlertTriangle className="h-12 w-12 text-amber-500" />
            </div>
            <h2 className="text-xl font-bold text-amber-400 mb-2">Anomalia Orario Rilevata</h2>
            <p className="text-slate-300 text-sm mb-6 text-center">
              {anomalyData.anomalyType === 'LATE_IN' && `Sei in ritardo rispetto all'inizio del turno (${anomalyData.plannedTime}).`}
              {anomalyData.anomalyType === 'OVERTIME' && `Stai uscendo oltre l'orario del turno (${anomalyData.plannedTime}).`}
              {anomalyData.anomalyType === 'EARLY_EXIT' && `Stai uscendo in anticipo rispetto al turno (${anomalyData.plannedTime}).`}
            </p>

            <div className="w-full mb-4">
              <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Motivazione</label>
              <select 
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-3 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={justificationCode}
                onChange={e => setJustificationCode(e.target.value)}
              >
                {AGENDA_CATEGORIES.map(cat => (
                  <optgroup key={cat.category} label={cat.category}>
                    {cat.items.map(item => (
                      <option key={item.code} value={item.code}>{item.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="w-full mb-6">
              <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Note aggiuntive</label>
              <textarea 
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-24"
                placeholder="Specifica eventuali dettagli..."
                value={justificationNotes}
                onChange={e => setJustificationNotes(e.target.value)}
              />
            </div>

            <button 
              onClick={submitJustification}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white px-6 py-4 rounded-xl font-bold text-lg shadow-lg transition-all"
            >
              Conferma e Timbra
            </button>
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
            <p className="text-slate-300 mb-8 text-center px-4">{message}</p>
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
