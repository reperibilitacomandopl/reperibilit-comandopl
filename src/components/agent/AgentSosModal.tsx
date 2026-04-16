"use client"

import { useState, useRef, useEffect } from "react"
import { X, Mic, Send, AlertTriangle, RefreshCw } from "lucide-react"
import toast from "react-hot-toast"

interface AgentSosModalProps {
  onClose: () => void
  onSendSos: (note: string, audioBlob: Blob | null) => Promise<boolean>
}

export default function AgentSosModal({ onClose, onSendSos }: AgentSosModalProps) {
  const [sosNote, setSosNote] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [isSending, setIsSending] = useState(false)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        stream.getTracks().forEach(track => track.stop())
      }

      recorder.start()
      setIsRecording(true)
      setRecordingDuration(0)
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1)
      }, 1000)
    } catch {
      toast.error("Impossibile accedere al microfono.")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }

  const handleSend = async () => {
    setIsSending(true)
    const success = await onSendSos(sosNote, audioBlob)
    if (success) {
      onClose()
    }
    setIsSending(false)
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  return (
    <div className="fixed inset-0 bg-red-950/40 backdrop-blur-xl z-[150] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-br from-red-600 to-rose-700 p-10 text-white relative">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
          <div className="flex justify-between items-start relative z-10 mb-6">
            <div className="p-4 bg-white/20 rounded-3xl backdrop-blur-md border border-white/20 shadow-lg">
              <AlertTriangle size={36} className="text-white animate-pulse" />
            </div>
            <button onClick={onClose} className="p-2 bg-black/10 hover:bg-black/20 rounded-2xl transition-all">
              <X size={24} />
            </button>
          </div>
          <h3 className="text-4xl font-black tracking-tight leading-none mb-4">SOS Emergenza</h3>
          <p className="text-red-100 text-base font-bold opacity-90 leading-relaxed">
            Invia immediatamente la tua posizione GPS aggiornata alla Centrale Operativa.
          </p>
        </div>

        <div className="p-10 space-y-8">
          <div>
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Nota Rapida (Opzionale)</label>
            <textarea 
              placeholder="Es: Incidente stradale, rapina in corso, malore..."
              value={sosNote}
              onChange={(e) => setSosNote(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] px-6 py-5 text-sm font-bold text-slate-800 placeholder:text-slate-300 focus:border-red-400 focus:outline-none transition-all resize-none h-32"
            />
          </div>

          <div className="flex flex-col items-center gap-4">
            <button 
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
              className={`w-28 h-28 rounded-full flex flex-col items-center justify-center gap-2 transition-all shadow-xl active:scale-90 ${
                isRecording 
                  ? 'bg-red-600 scale-110 shadow-red-200 animate-pulse' 
                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
              }`}
            >
              <Mic size={32} />
              {isRecording ? (
                <span className="text-[10px] font-black">{recordingDuration}s</span>
              ) : (
                <span className="text-[9px] font-bold uppercase tracking-widest text-center px-2">Premi e tieni</span>
              )}
            </button>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {audioBlob ? "✅ Audio Registrato" : "Registra un messaggio vocale"}
            </p>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={onClose}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs uppercase tracking-widest py-6 rounded-3xl transition-all"
            >
              Annulla
            </button>
            <button 
              disabled={isSending}
              onClick={handleSend}
              className="flex-[2] bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-[0.2em] py-6 rounded-3xl shadow-xl shadow-red-100 transition-all hover:-translate-y-1 active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isSending ? <RefreshCw size={20} className="animate-spin" /> : <Send size={20} />}
              Invia Segnale SOS
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
