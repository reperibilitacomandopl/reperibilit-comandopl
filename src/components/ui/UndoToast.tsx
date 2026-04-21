"use client"

import React from "react"
import { RotateCcw, X } from "lucide-react"
import toast, { Toast } from "react-hot-toast"

interface UndoToastProps {
  t: Toast
  message: string
  onUndo: () => void
  actionLabel?: string
}

export default function UndoToast({ t, message, onUndo, actionLabel = "Annulla" }: UndoToastProps) {
  return (
    <div
      className={`${
        t.visible ? "animate-in fade-in slide-in-from-bottom-5" : "animate-out fade-out slide-out-to-bottom-5"
      } max-w-md w-full bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 overflow-hidden`}
    >
      <div className="flex-1 w-0 p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0 pt-0.5">
            <div className="h-10 w-10 rounded-full bg-blue-600/20 flex items-center justify-center">
              <RotateCcw className="h-5 w-5 text-blue-400" />
            </div>
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-black text-white uppercase tracking-wider">
              Azione Eseguita
            </p>
            <p className="mt-1 text-sm font-bold text-slate-400">
              {message}
            </p>
          </div>
        </div>
      </div>
      <div className="flex border-l border-slate-800">
        <button
          onClick={() => {
            onUndo()
            toast.dismiss(t.id)
          }}
          className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-xs font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 hover:bg-slate-800 focus:outline-none transition-colors"
        >
          {actionLabel}
        </button>
        <button
          onClick={() => toast.dismiss(t.id)}
          className="w-full border border-transparent rounded-none p-4 flex items-center justify-center text-slate-500 hover:text-slate-400 hover:bg-slate-800 focus:outline-none transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      
      {/* Progress Bar Timer Overlay */}
      <div className="absolute bottom-0 left-0 h-1 bg-blue-600/30 w-full overflow-hidden">
        <div 
          className="h-full bg-blue-500 transition-all ease-linear"
          style={{ 
            width: '100%',
            animation: `toast-progress ${t.duration || 4000}ms linear forwards` 
          }}
        ></div>
      </div>

      <style jsx>{`
        @keyframes toast-progress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  )
}

/**
 * Utility to trigger the Undo Toast
 */
export const showUndoToast = (message: string, onUndo: () => void, duration = 5000) => {
  toast.custom((t) => (
    <UndoToast t={t} message={message} onUndo={onUndo} />
  ), { duration })
}
