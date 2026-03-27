"use client"

import { signIn } from "next-auth/react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Shield, Lock, ArrowRight } from "lucide-react"

export default function LoginPage() {
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")
    
    const formData = new FormData(e.currentTarget)
    const matricola = formData.get("matricola")
    const password = formData.get("password")

    const res = await signIn("credentials", {
      matricola,
      password,
      redirect: false,
    })

    if (res?.error) {
      setError("Credenziali non valide. Verifica matricola e password.")
      setLoading(false)
    } else {
      router.push("/")
      router.refresh()
    }
  }

  return (
    <main className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-3xl"></div>
        <div className="absolute top-[40%] left-[30%] w-[300px] h-[300px] bg-cyan-500/3 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }}></div>

      <div className="relative z-10 w-full max-w-[420px] mx-4">
        {/* Logo Card */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl mb-5 shadow-2xl">
            <Shield size={40} className="text-blue-400" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Polizia Locale
          </h1>
          <p className="text-blue-300/60 text-sm font-medium mt-1">
            Comando di Altamura
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden">
          <div className="p-8">
            <h2 className="text-xl font-bold text-white mb-1">
              Accesso al Portale
            </h2>
            <p className="text-blue-200/50 text-xs font-medium mb-6">
              Inserisci le credenziali per accedere al sistema di gestione reperibilità
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-[11px] font-bold text-blue-200/70 uppercase tracking-wider mb-2" htmlFor="matricola">
                  Matricola
                </label>
                <div className="relative">
                  <input
                    className="w-full bg-white/5 border-2 border-white/10 rounded-xl px-4 py-3 text-sm text-white font-semibold placeholder:text-white/20 focus:border-blue-400/50 focus:bg-white/10 focus:outline-none transition-all"
                    id="matricola" type="text" name="matricola" placeholder="Es. ROSSI001" required
                    autoComplete="username"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-blue-200/70 uppercase tracking-wider mb-2" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <input
                    className="w-full bg-white/5 border-2 border-white/10 rounded-xl px-4 py-3 text-sm text-white font-semibold placeholder:text-white/20 focus:border-blue-400/50 focus:bg-white/10 focus:outline-none transition-all"
                    id="password" type="password" name="password" placeholder="••••••••" required minLength={6}
                    autoComplete="current-password"
                  />
                  <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/15" />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-xs font-semibold flex items-center gap-2">
                  <span className="text-base">🚨</span> {error}
                </div>
              )}

              <button
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl px-4 py-3.5 text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30 hover:shadow-xl hover:shadow-blue-900/40 active:scale-[0.98]"
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Accesso in corso...
                  </>
                ) : (
                  <>
                    Accedi <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="border-t border-white/10 px-8 py-4 bg-white/5">
            <p className="text-[10px] text-white/30 text-center font-medium">
              Comando di Polizia Locale di Altamura · Sistema Reperibilità v1.0
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
