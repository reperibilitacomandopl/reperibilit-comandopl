"use client"

import { X, Smartphone, Monitor, Globe, FileDown } from "lucide-react"

interface AgentSyncModalProps {
  userId: string
  userName: string
  onClose: () => void
}

export default function AgentSyncModal({ userId, onClose }: AgentSyncModalProps) {
  const host = typeof window !== 'undefined' ? window.location.host : ''
  const protocol = typeof window !== 'undefined' ? window.location.protocol : 'https:'

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 text-white flex justify-between items-center">
          <div>
            <h3 className="text-lg font-black">Sincronizza Calendario</h3>
            <p className="text-blue-200 text-xs mt-0.5">Scegli il tuo dispositivo per importare tutte le reperibilità</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white p-1"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-3">
          <button
            onClick={() => {
              window.location.href = `webcal://${host}/api/calendar/${userId}`
            }}
            className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-100 hover:border-blue-400 hover:bg-blue-50/50 transition-all text-left"
          >
            <div className="p-3 bg-slate-100 rounded-xl shrink-0"><Smartphone size={24} className="text-slate-700" /></div>
            <div>
              <p className="font-bold text-sm text-slate-800">iPhone / iPad / Mac</p>
              <p className="text-xs text-slate-500">Abbonamento automatico. Le reperibilità appariranno nel tuo Calendario Apple e si aggiorneranno in automatico.</p>
            </div>
          </button>

          <button
            onClick={() => {
              window.location.href = `webcal://${host}/api/calendar/${userId}`
            }}
            className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-100 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all text-left"
          >
            <div className="p-3 bg-slate-100 rounded-xl shrink-0"><Monitor size={24} className="text-slate-700" /></div>
            <div>
              <p className="font-bold text-sm text-slate-800">Windows / Outlook</p>
              <p className="text-xs text-slate-500">Abbonamento a calendario Internet. Outlook importerà tutti gli eventi e li terrà aggiornati.</p>
            </div>
          </button>

          <button
            onClick={() => {
              const calUrl = `${protocol}//${host}/api/calendar/${userId}`
              const gcalUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(calUrl)}`
              window.open(gcalUrl, '_blank')
            }}
            className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-100 hover:border-emerald-400 hover:bg-emerald-50/50 transition-all text-left"
          >
            <div className="p-3 bg-slate-100 rounded-xl shrink-0"><Globe size={24} className="text-slate-700" /></div>
            <div>
              <p className="font-bold text-sm text-slate-800">Google Calendar / Android</p>
              <p className="text-xs text-slate-500">Sincronizza con Google. Riceverai una notifica sul tuo smartphone 1 ora prima di ogni turno di reperibilità.</p>
            </div>
          </button>

          <div className="pt-3 border-t border-slate-100">
            <button
              onClick={() => {
                window.location.href = `/api/calendar/${userId}`
                onClose()
              }}
              className="w-full flex items-center justify-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-600 py-2 transition-colors"
            >
              <FileDown size={14} />
              Scarica file .ics manualmente
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
