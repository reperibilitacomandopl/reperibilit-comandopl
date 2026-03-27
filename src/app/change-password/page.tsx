"use client"

import { useState } from "react"
import { signOut } from "next-auth/react"
import { Lock, ArrowRight } from "lucide-react"
import toast from "react-hot-toast"

export default function ChangePasswordPage() {
  const [newPass, setNewPass] = useState("")
  const [confirmPass, setConfirmPass] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (newPass.length < 6) return toast.error("La password deve essere di almeno 6 caratteri")
    if (newPass !== confirmPass) return toast.error("Le password non coincidono")
    
    setLoading(true)
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: newPass })
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || "Errore")
      }
      
      toast.success("Password aggiornata! Effettua il login con la nuova password.")
      // Sign out to clear the stale JWT, then redirect to login
      await signOut({ callbackUrl: "/login" })
    } catch (err: any) {
      toast.error(err.message || "Errore imprevisto")
      setLoading(false)
    }
  }

  return (
    <main className="flex items-center justify-center min-h-screen bg-slate-900 border-t-8 border-indigo-500 relative overflow-hidden">
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-3xl"></div>
      
      <div className="relative z-10 w-full max-w-[420px] mx-4 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-4 text-white">
            <Lock size={32} />
          </div>
          <h2 className="text-2xl font-black text-white">Aggiorna la tua Password</h2>
          <p className="text-blue-200/70 text-sm mt-2">
            Per questioni di sicurezza, è obbligatorio impostare una password personale al primo accesso.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-blue-200/70 uppercase tracking-wider mb-2">
              Nuova Password
            </label>
            <input
              className="w-full bg-white/5 border-2 border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-indigo-400 focus:outline-none"
              type="password" placeholder="Minimo 6 caratteri"
              value={newPass} onChange={e => setNewPass(e.target.value)} required minLength={6}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-blue-200/70 uppercase tracking-wider mb-2">
              Conferma Password
            </label>
            <input
              className="w-full bg-white/5 border-2 border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-indigo-400 focus:outline-none"
              type="password" placeholder="Ripeti password"
              value={confirmPass} onChange={e => setConfirmPass(e.target.value)} required minLength={6}
            />
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-4 py-3.5 text-sm font-bold flex items-center justify-center gap-2 mt-4"
          >
            {loading ? "Salvataggio..." : "Salva e Accedi"} <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </main>
  )
}
