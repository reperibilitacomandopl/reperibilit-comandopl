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
  const analyzerRef = useRef<AnalyserNode | null>(null)
  const animationRef = useRef<number | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const source = audioContext.createMediaStreamSource(stream)
      const analyzer = audioContext.createAnalyser()
      analyzer.fftSize = 256
      source.connect(analyzer)
      analyzerRef.current = analyzer

      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : MediaRecorder.isTypeSupported('audio/mp4') 
          ? 'audio/mp4' 
          : 'audio/wav';

      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        setAudioBlob(blob)
        
        // Automatic send on stop
        setIsSending(true)
        const success = await onSendSos(sosNote, blob)
        if (success) {
          onClose()
        }
        setIsSending(false)
      }

      recorder.start()
      setIsRecording(true)
      setRecordingDuration(0)
      
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => {
          if (prev >= 60) {
            stopRecording()
            toast.success("Limite di 60s raggiunto. Invio automatico...")
            return prev
          }
          return prev + 1
        })
      }, 1000)

      draw()
    } catch (err) {
      console.error(err)
      toast.error("Impossibile accedere al microfono. Verifica i permessi nelle impostazioni del browser.")
      setIsRecording(false)
    }
  }

  const stopRecording = () => {
    setIsRecording(false)
    if (timerRef.current) clearInterval(timerRef.current)
    if (animationRef.current) cancelAnimationFrame(animationRef.current)
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }
  }

  const draw = () => {
    if (!analyzerRef.current || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const bufferLength = analyzerRef.current.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const renderFrame = () => {
      animationRef.current = requestAnimationFrame(renderFrame)
      analyzerRef.current!.getByteFrequencyData(dataArray)

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      const barWidth = (canvas.width / bufferLength) * 2.5
      let barHeight
      let x = 0

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height
        
        // Gradient styling
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0)
        gradient.addColorStop(0, '#ef4444')
        gradient.addColorStop(1, '#f87171')
        
        ctx.fillStyle = gradient
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight)
        x += barWidth + 2
      }
    }
    renderFrame()
  }

  const handleSendOnlyText = async () => {
    if (isRecording) stopRecording()
    setIsSending(true)
    const success = await onSendSos(sosNote, null)
    if (success) {
      onClose()
    }
    setIsSending(false)
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  return (
    <div className="fixed inset-0 bg-red-950/70 backdrop-blur-xl z-[150] flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
      <div className="bg-white rounded-[3.5rem] shadow-[0_35px_60px_-15px_rgba(220,38,38,0.3)] w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300 border border-red-100" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-br from-red-600 via-red-700 to-rose-800 p-10 text-white relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
          <div className="flex justify-between items-start relative z-10 mb-6">
            <div className="p-5 bg-white/20 rounded-[2rem] backdrop-blur-md border border-white/30 shadow-2xl">
              <AlertTriangle size={42} className="text-white animate-pulse" />
            </div>
            <button onClick={onClose} className="p-3 bg-black/10 hover:bg-black/20 rounded-2xl transition-all border border-white/10">
              <X size={28} />
            </button>
          </div>
          <h3 className="text-4xl font-black tracking-tighter leading-none mb-4 uppercase">SOS Emergenza</h3>
          <p className="text-red-100 text-lg font-bold opacity-90 leading-tight">
            Tocca il microfono per registrare un messaggio vocale. L'allerta verrà inviata automaticamente allo stop.
          </p>
        </div>

        <div className="p-8 sm:p-10 space-y-8">
          <div>
            <textarea 
              placeholder="Inserisci una nota rapida (opzionale)..."
              value={sosNote}
              onChange={(e) => setSosNote(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] px-8 py-6 text-base font-bold text-slate-800 placeholder:text-slate-300 focus:border-red-400 focus:ring-4 focus:ring-red-50/50 focus:outline-none transition-all resize-none h-28 shadow-inner"
            />
          </div>

          <div className="flex flex-col items-center gap-6 py-2">
            <div className="relative w-full flex flex-col items-center">
              <div className="w-full h-20 bg-slate-50/50 rounded-3xl mb-6 flex items-center justify-center overflow-hidden border border-slate-100 shadow-inner">
                <canvas 
                  ref={canvasRef} 
                  width={400} 
                  height={80} 
                  className={`w-full h-full transition-opacity duration-500 ${isRecording ? 'opacity-100' : 'opacity-0'}`}
                />
                {!isRecording && !isSending && (
                   <span className="absolute text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Audio Visualizer Off</span>
                )}
                {isSending && (
                   <div className="absolute flex items-center gap-3">
                      <RefreshCw className="text-red-600 animate-spin" size={20} />
                      <span className="text-[10px] font-black text-red-600 uppercase tracking-[0.2em]">Acquisizione GPS & Invio...</span>
                   </div>
                )}
              </div>
              
              <button 
                disabled={isSending}
                onClick={isRecording ? stopRecording : startRecording}
                className={`group relative w-36 h-36 rounded-full flex flex-col items-center justify-center gap-2 transition-all shadow-2xl active:scale-95 disabled:opacity-50 ${
                  isRecording 
                    ? 'bg-red-600 scale-110 shadow-red-200 ring-[12px] ring-red-50' 
                    : 'bg-white text-slate-400 hover:bg-slate-50 border-[6px] border-slate-100'
                }`}
              >
                {isRecording ? (
                  <>
                    <div className="w-10 h-10 bg-white rounded-2xl animate-pulse shadow-lg" />
                    <span className="text-sm font-black text-white mt-3 bg-black/20 px-3 py-1 rounded-full">{recordingDuration}s</span>
                  </>
                ) : (
                  <>
                    <div className={`absolute inset-0 rounded-full bg-red-500/10 ${isSending ? '' : 'group-hover:animate-ping'}`}></div>
                    <Mic size={48} className={`relative z-10 transition-colors ${isSending ? 'text-slate-200' : 'text-slate-400 group-hover:text-red-500'}`} />
                    <span className="relative z-10 text-[9px] font-black uppercase tracking-[0.2em] text-center px-4 mt-1">Avvia</span>
                  </>
                )}
              </button>
            </div>
            
            <div className="text-center">
              <p className={`text-[11px] font-black uppercase tracking-[0.2em] transition-colors ${isRecording ? 'text-red-600' : 'text-slate-400'}`}>
                {isRecording ? "Registrazione attiva - Tocca per terminare e inviare" : "Tocca per parlare e inviare posizione"}
              </p>
            </div>
          </div>

          <div className="flex gap-4 pt-2">
            <button 
              onClick={onClose}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs uppercase tracking-widest py-6 rounded-[2rem] transition-all border-b-4 border-slate-200"
            >
              Chiudi
            </button>
            <button 
              disabled={isSending || isRecording}
              onClick={handleSendOnlyText}
              className="flex-[1.5] bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-[0.2em] py-6 rounded-[2rem] shadow-xl transition-all hover:-translate-y-1 active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50 border-b-4 border-slate-950"
            >
               <Send size={18} />
               Senza Vocale
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
