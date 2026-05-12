"use client"

import { useState, useEffect } from "react"
import { Shield, Smartphone, Lock, CheckCircle2, AlertCircle, Copy, QrCode } from "lucide-react"
import { useParams, useRouter, useSearchParams } from "next/navigation"

export default function SecurityPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const forceMFA = searchParams.get("forceMFA") === "true"
  
  const [loading, setLoading] = useState(true)
  const [setupData, setSetupData] = useState<{ qrCode: string; secret: string } | null>(null)
  const [token, setToken] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)

  useEffect(() => {
    fetchSetup()
  }, [])

  const fetchSetup = async () => {
    try {
      const res = await fetch("/api/auth/2fa/setup")
      if (res.ok) {
        const data = await res.json()
        setSetupData(data)
      } else {
        const errorData = await res.json()
        if (errorData.alreadyEnabled) {
          setSuccess(true)
        }
      }
    } catch (err) {
      setError("Errore durante il caricamento del setup MFA")
    } finally {
      setLoading(false)
    }
  }

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

      if (res.ok) {
        setSuccess(true)
        setTimeout(() => {
          router.push(`/${params.tenantSlug}/admin/pannello`)
        }, 2000)
      } else {
        const data = await res.json()
        setError(data.error || "Codice non valido")
      }
    } catch (err) {
      setError("Errore di connessione")
    } finally {
      setIsVerifying(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
    </div>
  )

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 mb-4">
          <Shield className="text-indigo-400" size={40} />
        </div>
        <h1 className="text-4xl font-black text-white tracking-tighter uppercase">
          Sicurezza <span className="text-indigo-400">Account</span>
        </h1>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">
          Protezione Multi-Fattore (MFA) Obbligatoria per Amministratori
        </p>
      </div>

      {forceMFA && !success && (
        <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-[2rem] flex items-start gap-4">
          <AlertCircle className="text-amber-400 shrink-0" size={24} />
          <div>
            <h3 className="text-amber-400 font-black uppercase text-sm tracking-widest">Attenzione: MFA Obbligatoria</h3>
            <p className="text-slate-400 text-xs mt-1">
              In conformità con le direttive AGID/SaaS-PA, il tuo account amministratore richiede l'attivazione del secondo fattore di autenticazione per procedere.
            </p>
          </div>
        </div>
      )}

      {success ? (
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-12 rounded-[3rem] text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight uppercase">MFA Attiva</h2>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Il tuo account è ora protetto. Reindirizzamento in corso...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-slate-900/50 border border-white/5 p-8 rounded-[2.5rem] space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                <QrCode className="text-indigo-400" size={20} />
              </div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight">1. Scansiona QR Code</h3>
            </div>
            
            <p className="text-sm text-slate-400 leading-relaxed">
              Usa un'app come <strong>Google Authenticator</strong> o <strong>Microsoft Authenticator</strong> sul tuo smartphone per scansionare il codice.
            </p>

            {setupData?.qrCode ? (
              <div className="bg-white p-4 rounded-3xl inline-block mx-auto">
                <img src={setupData.qrCode} alt="MFA QR Code" className="w-48 h-48" />
              </div>
            ) : (
              <div className="w-48 h-48 bg-slate-800 rounded-3xl animate-pulse mx-auto flex items-center justify-center text-slate-600">
                Caricamento...
              </div>
            )}

            <div className="pt-4 space-y-2">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Codice Segreto (Alternativo)</p>
              <div className="bg-slate-950 border border-white/5 p-3 rounded-xl flex items-center justify-between">
                <code className="text-indigo-400 font-mono text-sm">{setupData?.secret || "••••••••••••"}</code>
                <button 
                  onClick={() => {
                    if (setupData?.secret) navigator.clipboard.writeText(setupData.secret)
                  }}
                  className="text-slate-500 hover:text-white transition-colors"
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-white/5 p-8 rounded-[2.5rem] space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                <Smartphone className="text-indigo-400" size={20} />
              </div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight">2. Verifica Codice</h3>
            </div>

            <p className="text-sm text-slate-400 leading-relaxed">
              Inserisci il codice a 6 cifre generato dall'app per confermare l'attivazione.
            </p>

            <form onSubmit={handleVerify} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Codice di Verifica</label>
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="000 000"
                  className="w-full bg-slate-950 border border-white/10 rounded-2xl p-4 text-center text-2xl font-black tracking-[0.3em] text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                  maxLength={6}
                  required
                />
              </div>

              {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl text-rose-400 text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isVerifying || token.length < 6}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white rounded-2xl text-sm font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2"
              >
                {isVerifying ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                ) : (
                  <Lock size={18} />
                )}
                Attiva MFA
              </button>
            </form>

            <div className="bg-slate-800/30 p-4 rounded-2xl">
              <p className="text-[10px] text-slate-500 italic">
                * Assicurati di salvare il codice segreto in un posto sicuro. Se perdi l'accesso all'app, dovrai contattare il supporto tecnico per il reset.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
