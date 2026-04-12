import { Shield, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 bg-blue-500/10 border border-blue-500/20 rounded-3xl flex items-center justify-center mx-auto mb-8">
          <Shield className="w-10 h-10 text-blue-400" />
        </div>

        <div className="text-7xl font-black text-white/10 mb-4 tracking-tighter">404</div>
        
        <h1 className="text-2xl font-black text-white mb-3 tracking-tight">
          Pagina Non Trovata
        </h1>
        <p className="text-white/40 text-sm font-medium mb-8 leading-relaxed">
          La pagina che stai cercando non esiste o è stata spostata. 
          Controlla l&apos;URL e riprova.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-600/20 hover:shadow-xl transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Torna alla Home
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto px-6 py-3 bg-white/5 border border-white/10 text-white/80 rounded-xl font-bold text-sm hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
          >
            Accedi al Portale
          </Link>
        </div>
      </div>
    </div>
  )
}
