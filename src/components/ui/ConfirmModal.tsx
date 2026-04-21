"use client"

import { useState, useEffect } from "react"
import { AlertTriangle, Loader2, X } from "lucide-react"

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  message: string
  /** Number of items affected (shown as count badge) */
  count?: number
  /** Destructive actions use red styling + delay */
  destructive?: boolean
  /** Seconds to wait before enabling confirm button (anti-misclick) */
  delaySeconds?: number
  confirmLabel?: string
  cancelLabel?: string
  isLoading?: boolean
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  count,
  destructive = false,
  delaySeconds = 2,
  confirmLabel = "Conferma",
  cancelLabel = "Annulla",
  isLoading = false
}: ConfirmModalProps) {
  const [countdown, setCountdown] = useState(destructive ? delaySeconds : 0)

  useEffect(() => {
    if (!isOpen) return
    if (!destructive) { setCountdown(0); return }
    
    setCountdown(delaySeconds)
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(timer); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [isOpen, destructive, delaySeconds])

  if (!isOpen) return null

  const accentColor = destructive ? "rose" : "blue"

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-6 text-center ${destructive ? 'bg-rose-600' : 'bg-blue-600'} text-white relative overflow-hidden`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
          <div className="relative z-10">
            <div className="bg-white/20 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertTriangle size={28} className="text-white" />
            </div>
            <h3 className="text-xl font-black uppercase tracking-tight">{title}</h3>
            {count !== undefined && (
              <div className="mt-2 inline-flex items-center gap-2 bg-white/20 px-4 py-1.5 rounded-full">
                <span className="text-sm font-black">{count}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">elementi coinvolti</span>
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="p-8">
          <p className="text-sm text-slate-600 leading-relaxed mb-8">{message}</p>
          
          <div className="flex flex-col gap-3">
            <button
              onClick={onConfirm}
              disabled={countdown > 0 || isLoading}
              className={`w-full py-4 font-black rounded-2xl shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 text-sm uppercase tracking-widest ${
                destructive
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'
              }`}
            >
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : countdown > 0 ? (
                `Attendi ${countdown}s...`
              ) : (
                confirmLabel
              )}
            </button>
            
            <button
              onClick={onClose}
              disabled={isLoading}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl text-xs uppercase tracking-widest transition-all"
            >
              {cancelLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
