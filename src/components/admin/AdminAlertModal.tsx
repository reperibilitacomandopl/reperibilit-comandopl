"use client"

import { useState } from "react"
import { X, Send, Users, AlertTriangle, Loader2 } from "lucide-react"
import toast from "react-hot-toast"

interface AdminAlertModalProps {
  onClose: () => void
  onSend: (message: string) => Promise<void>
  isSending: boolean
  recipients: { id: string; name: string }[]
}

export default function AdminAlertModal({ onClose, onSend, isSending, recipients }: AdminAlertModalProps) {
  const [message, setMessage] = useState("🚨 URGENZA! Recarsi in comando entro 30 min.")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return toast.error("Inserisci un messaggio")
    await onSend(message)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={onClose}></div>
      
      <div className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-8 bg-rose-600 text-white flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-2xl border border-white/20">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black uppercase tracking-tight">Chiama Reperibili</h3>
              <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mt-1">Sentinel Allerta Urgenza</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {/* Recipients List */}
          <div className="space-y-3">
             <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                   <Users size={12} /> Destinatari ({recipients.length})
                </p>
             </div>
             <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                {recipients.length > 0 ? recipients.map(r => (
                  <span key={r.id} className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold border border-slate-200 shadow-sm">
                    👮‍♂️ {r.name}
                  </span>
                )) : (
                  <p className="text-xs text-rose-500 font-bold italic">Nessun agente in reperibilità oggi!</p>
                )}
             </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Messaggio Personalizzato</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all outline-none resize-none"
              placeholder="Scrivi qui il messaggio di allerta..."
              required
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 px-8 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
            >
              Annulla
            </button>
            <button 
              type="submit"
              disabled={isSending || recipients.length === 0}
              className="flex-3 flex items-center justify-center gap-3 px-8 py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-rose-900/20 active:scale-95 transition-all disabled:opacity-50"
            >
              {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              INVIA ALLERTA ORA
            </button>
          </div>
        </form>

        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
            <p className="text-[8px] text-slate-400 font-black uppercase tracking-[0.3em]">Sentinel Autonomous Monitoring System</p>
        </div>
      </div>
    </div>
  )
}
