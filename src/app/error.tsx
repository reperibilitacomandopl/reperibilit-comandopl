"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react"
import Link from "next/link"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    console.error("APP CRASH:", error?.message, error?.stack, error?.digest)
  }, [error])

  const errMsg = error?.message || "Errore sconosciuto"
  const errStack = error?.stack || ""

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-6">
      <div className="max-w-lg w-full text-center">
        <div className="w-20 h-20 bg-rose-500/10 border border-rose-500/20 rounded-3xl flex items-center justify-center mx-auto mb-8">
          <AlertTriangle className="w-10 h-10 text-rose-400" />
        </div>

        <h1 className="text-3xl font-black text-white mb-3 tracking-tight">
          Qualcosa è andato storto
        </h1>

        {/* Dettagli errore visibili — per debug */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 mb-6 text-left">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-2"
          >
            <Bug size={14} />
            {showDetails ? "Nascondi dettagli" : "Mostra dettagli tecnici"}
          </button>
          {showDetails && (
            <div className="space-y-2 text-xs">
              <div>
                <p className="text-slate-500 font-bold uppercase mb-1">Messaggio</p>
                <p className="text-red-400 font-mono break-all">{errMsg}</p>
              </div>
              {error?.digest && (
                <div>
                  <p className="text-slate-500 font-bold uppercase mb-1">Digest</p>
                  <p className="text-slate-300 font-mono break-all">{error.digest}</p>
                </div>
              )}
              {errStack && (
                <div>
                  <p className="text-slate-500 font-bold uppercase mb-1">Stack (prime 3 righe)</p>
                  <pre className="text-slate-400 font-mono text-[10px] overflow-auto max-h-32 whitespace-pre-wrap break-all">
                    {errStack.split('\n').slice(0, 3).join('\n')}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        <p className="text-white/40 text-sm font-medium mb-8 leading-relaxed">
          Si è verificato un errore imprevisto. Prova a ricaricare la pagina.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={reset}
            className="w-full sm:w-auto px-6 py-3 bg-white text-slate-900 rounded-xl font-bold text-sm hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Riprova
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-3 bg-white/5 border border-white/10 text-white/80 rounded-xl font-bold text-sm hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" /> Torna alla Home
          </Link>
        </div>
      </div>
    </div>
  )
}
