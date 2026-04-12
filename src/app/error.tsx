"use client"

import { useEffect } from "react"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"
import Link from "next/link"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Application error:", error)
  }, [error])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 bg-rose-500/10 border border-rose-500/20 rounded-3xl flex items-center justify-center mx-auto mb-8">
          <AlertTriangle className="w-10 h-10 text-rose-400" />
        </div>
        
        <h1 className="text-3xl font-black text-white mb-3 tracking-tight">
          Qualcosa è andato storto
        </h1>
        <p className="text-white/40 text-sm font-medium mb-8 leading-relaxed">
          Si è verificato un errore imprevisto. Il team tecnico è stato avvisato. 
          Prova a ricaricare la pagina.
        </p>

        {error.digest && (
          <p className="text-xs text-white/20 font-mono mb-6">
            Codice errore: {error.digest}
          </p>
        )}

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
