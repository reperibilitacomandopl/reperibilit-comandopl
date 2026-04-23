"use client"

import React, { useState, useEffect } from "react"
import { ShieldCheck, Lock, RefreshCw, KeyRound, AlertCircle } from "lucide-react"
import { useSession } from "next-auth/react"

export default function TwoFactorModal() {
  const { data: session, update } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const [token, setToken] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Show modal if 2FA is enabled but not yet verified in this session
    if (session?.user?.twoFactorEnabled && !session.user.twoFactorVerified) {
      setIsOpen(true)
    } else {
      setIsOpen(false)
    }
  }, [session])

  if (!isOpen) return null

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (token.length < 6) return

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token })
      })

      const data = await res.json()

      if (res.ok && data.success) {
        // Update session with twoFactorVerified: true
        await update({ twoFactorVerified: true })
        setIsOpen(false)
      } else {
        setError(data.error || "Codice non valido")
      }
    } catch (e) {
      setError("Errore di connessione")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950 backdrop-blur-xl p-4">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 md:p-10 text-center space-y-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="p-5 bg-indigo-600 rounded-3xl text-white shadow-xl shadow-indigo-500/20">
              <ShieldCheck width={40} height={40} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Autenticazione 2FA</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Protezione Account Attiva</p>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              Inserisci il codice di sicurezza generato dall'app Authenticator sul tuo dispositivo per accedere al portale.
            </p>

            <form onSubmit={handleVerify} className="space-y-6">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <KeyRound width={20} height={20} />
                </div>
                <input 
                  type="text"
                  maxLength={6}
                  value={token}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "")
                    setToken(val)
                    if (error) setError(null)
                  }}
                  autoFocus
                  placeholder="000 000"
                  className={`w-full bg-slate-50 border-2 ${error ? 'border-red-200 focus:border-red-500' : 'border-slate-100 focus:border-indigo-500'} rounded-2xl py-4 pl-12 pr-4 text-center text-2xl font-black tracking-[0.5em] outline-none transition-all`}
                />
              </div>

              {error && (
                <div className="flex items-center justify-center gap-2 text-red-600 bg-red-50 py-3 rounded-xl border border-red-100 animate-in fade-in slide-in-from-top-2">
                  <AlertCircle width={16} height={16} />
                  <span className="text-[11px] font-black uppercase tracking-wider">{error}</span>
                </div>
              )}

              <button 
                type="submit"
                disabled={isSubmitting || token.length < 6}
                className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                {isSubmitting ? <RefreshCw className="animate-spin" width={18} height={18} /> : <Lock width={18} height={18} />}
                Verifica ed Entra
              </button>
            </form>
          </div>

          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
            Se hai perso l'accesso al tuo dispositivo di autenticazione, contatta l'amministratore di sistema per il reset dell'account.
          </p>
        </div>
      </div>
    </div>
  )
}
