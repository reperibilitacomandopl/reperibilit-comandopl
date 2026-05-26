"use client"

import { useState } from "react"
import { Shield, Lock, AlertCircle, Smartphone } from "lucide-react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

export default function Verify2FAPage() {
  const router = useRouter()
  const { update } = useSession()
  const [token, setToken] = useState("")
  const [error, setError] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsVerifying(true)
    setError("")

    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token })
      })

      const data = await res.json()

      if (res.ok) {
        // Aggiorna il cookie di sessione locale prima di navigare
        await update({ twoFactorVerified: true, twoFactorProof: data.proof })
        // Redirigi alla home o alla pagina precedente
        window.location.href = "/" 
      } else {
        setError(data.error || "Codice non valido")
      }
    } catch (err) {
      setError("Errore di connessione")
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent pointer-events-none"></div>
      <div className="absolute top-0 left-0 w-full h-full bg-slate-950/40 backdrop-blur-[2px] pointer-events-none"></div>
      
      <div className="max-w-md w-full relative z-10 animate-in zoom-in duration-500">
        <div className="bg-slate-900/50 border border-white/5 p-8 rounded-[3rem] shadow-2xl backdrop-blur-xl space-y-8">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 mb-2">
              <Shield className="text-indigo-400" size={40} />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Verifica <span className="text-indigo-400">2FA</span></h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Inserisci il codice dall'app Authenticator</p>
          </div>

          <form onSubmit={handleVerify} className="space-y-8">
            <div className="space-y-4">
              <div className="flex justify-center gap-2">
                 <Smartphone className="text-indigo-500/50" size={24} />
                 <span className="text-white/60 text-xs font-bold uppercase tracking-tighter">Apri l'app sul tuo smartphone</span>
              </div>
              
              <div className="relative">
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="000000"
                  className="w-full bg-slate-950/50 border border-white/10 rounded-2xl p-6 text-center text-4xl font-black tracking-[0.5em] text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-800"
                  maxLength={6}
                  required
                  autoFocus
                />
              </div>
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl text-rose-400 text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-2">
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isVerifying || token.length < 6}
              className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white rounded-2xl text-sm font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-indigo-900/40 flex items-center justify-center gap-3 active:scale-[0.98]"
            >
              {isVerifying ? (
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
              ) : (
                <Lock size={20} />
              )}
              Verifica e Accedi
            </button>
          </form>

          <div className="pt-4 border-t border-white/5 text-center">
            <button 
              onClick={() => router.push("/login")}
              className="text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest transition-colors"
            >
              Torna al Login
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
