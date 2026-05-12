'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

export default function QuickClockPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const type = searchParams.get('type') || 'OUT'
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Registrazione in corso...')

  useEffect(() => {
    const performClock = async () => {
      try {
        const res = await fetch('/api/admin/clock-in', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            type, 
            lat: null, 
            lng: null, 
            accuracy: null, 
            isManual: true 
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
          setMessage(data.error || 'Errore durante la timbratura.')
        }
      } catch (err) {
        setStatus('error')
        setMessage('Errore di connessione.')
      }
    }

    performClock()
  }, [type, router])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-6">
      <div className="bg-slate-800 p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm w-full text-center border border-slate-700">
        {status === 'loading' && (
          <>
            <Loader2 className="h-16 w-16 text-blue-500 animate-spin mb-4" />
            <h1 className="text-2xl font-bold mb-2">Timbratura Rapida</h1>
            <p className="text-slate-400">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="bg-green-500/20 p-4 rounded-full mb-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold mb-2 text-green-400">Confermato!</h1>
            <p className="text-slate-300 mb-6">{message}</p>
            <button 
              onClick={() => router.push('/')}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-semibold transition-all"
            >
              Torna alla Home
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="bg-red-500/20 p-4 rounded-full mb-4">
              <XCircle className="h-16 w-16 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold mb-2 text-red-400">Attenzione</h1>
            <p className="text-slate-300 mb-6">{message}</p>
            <button 
              onClick={() => router.push('/')}
              className="bg-slate-700 hover:bg-slate-600 text-white px-8 py-3 rounded-xl font-semibold transition-all"
            >
              Apri Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  )
}
