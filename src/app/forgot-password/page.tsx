"use client"

import { useState } from "react"
import { Shield, Mail, ArrowRight, AlertCircle, CheckCircle } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setSuccess(true)
      } else {
        setError(data.error || "Si è verificato un errore durante l'invio dell'email")
      }
    } catch (err) {
      setError("Errore di connessione al server")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[100dvh] flex flex-col justify-center bg-slate-950 text-slate-200 p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/10 blur-[120px] mix-blend-screen" />
      </div>

      <div className="w-full max-w-md mx-auto relative z-10">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 sm:p-10 rounded-[2.5rem] shadow-2xl overflow-hidden relative">
          
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 mb-6 shadow-lg shadow-blue-900/50 relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
              <Shield className="text-white relative z-10" size={32} strokeWidth={1.5} />
            </div>
            
            <h1 className="text-2xl font-black text-white tracking-tight mb-2">Recupero Password</h1>
            <p className="text-sm text-slate-400">
              Inserisci la tua email istituzionale per ricevere il link di recupero.
            </p>
          </div>

          {success ? (
            <div className="animate-in fade-in zoom-in duration-300">
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-2xl text-center space-y-4">
                <CheckCircle size={48} className="text-emerald-400 mx-auto" />
                <h3 className="text-lg font-bold text-white">Email Inviata!</h3>
                <p className="text-sm text-emerald-200/70">
                  Se l'indirizzo <strong>{email}</strong> è registrato nel sistema e associato a un Comando valido, riceverai a breve un'email con le istruzioni per impostare una nuova password.
                </p>
                <div className="pt-4 border-t border-emerald-500/20">
                  <a href="/login" className="text-xs font-bold text-emerald-400 hover:text-emerald-300 uppercase tracking-widest transition-colors">
                    Torna al Login
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-blue-200/90 uppercase tracking-wider mb-2" htmlFor="email">
                  Indirizzo Email
                </label>
                <div className="relative">
                  <input
                    className="w-full bg-white/5 border-2 border-white/10 rounded-xl px-4 py-3 text-sm text-white font-semibold placeholder:text-white/40 focus:border-blue-400 focus:bg-white/10 focus:ring-4 focus:ring-blue-500/20 focus:outline-none transition-all"
                    id="email" type="email" name="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nome.cognome@dominio.it" required
                    autoComplete="email"
                  />
                  <Mail size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/15" />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" /> {error}
                </div>
              )}

              <button
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl px-4 py-3.5 text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30 hover:shadow-xl hover:shadow-blue-900/40 active:scale-[0.98]"
                type="submit"
                disabled={loading || !email}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Invio in corso...
                  </>
                ) : (
                  <>
                    Invia Link <ArrowRight size={16} />
                  </>
                )}
              </button>
              
              <div className="text-center pt-2">
                <a href="/login" className="text-[10px] text-slate-400 hover:text-white transition-colors font-bold uppercase tracking-widest">
                  Annulla e Torna al Login
                </a>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  )
}
