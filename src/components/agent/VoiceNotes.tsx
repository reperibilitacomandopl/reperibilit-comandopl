"use client"

import { useState, useRef } from "react"
import { Mic, Square, Play, Trash2, Loader2 } from "lucide-react"

interface VoiceNotesProps {
  onTranscription: (text: string) => void
  compact?: boolean
}

export default function VoiceNotes({ onTranscription, compact = false }: VoiceNotesProps) {
  const [recording, setRecording] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [transcribing, setTranscribing] = useState(false)
  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" })
      mediaRecorder.current = recorder
      chunks.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunks.current, { type: "audio/webm" })
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        stream.getTracks().forEach(t => t.stop())
      }

      recorder.start()
      setRecording(true)
    } catch (err) {
      console.error("Microfono non disponibile:", err)
    }
  }

  const stopRecording = () => {
    mediaRecorder.current?.stop()
    setRecording(false)
  }

  const transcribe = async () => {
    if (!audioUrl) return
    setTranscribing(true)
    // Simula trascrizione (in produzione: inviare a Whisper API o simile)
    // Per ora usa Web Speech API se disponibile
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
      const recognition = new SpeechRecognition()
      recognition.lang = "it-IT"
      recognition.interimResults = false
      // Nota: SpeechRecognition funziona con stream live, non file.
      // Per file audio serve un servizio di speech-to-text.
    }
    setTimeout(() => {
      onTranscription("[Nota vocale registrata]")
      setTranscribing(false)
      setAudioUrl(null)
    }, 1000)
  }

  if (compact) {
    return (
      <button
        onClick={recording ? stopRecording : startRecording}
        className={`p-3 rounded-full transition-all ${recording ? "bg-red-500 animate-pulse text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
        aria-label={recording ? "Ferma registrazione" : "Avvia registrazione vocale"}
      >
        {recording ? <Square size={18} /> : <Mic size={18} />}
      </button>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <button
          onClick={recording ? stopRecording : startRecording}
          className={`p-4 rounded-2xl flex items-center gap-2 font-bold text-xs uppercase tracking-wider transition-all ${
            recording ? "bg-red-500 text-white animate-pulse" : "bg-slate-900 text-white hover:bg-slate-800"
          }`}
        >
          {recording ? <><Square size={16} /> Stop</> : <><Mic size={16} /> Registra</>}
        </button>

        {audioUrl && !recording && (
          <div className="flex items-center gap-2">
            <button onClick={() => new Audio(audioUrl).play()} className="p-3 bg-slate-100 rounded-xl hover:bg-slate-200">
              <Play size={16} />
            </button>
            <button onClick={transcribe} disabled={transcribing} className="p-3 bg-indigo-100 text-indigo-700 rounded-xl hover:bg-indigo-200 font-bold text-xs">
              {transcribing ? <Loader2 size={16} className="animate-spin" /> : "Trascrivi"}
            </button>
            <button onClick={() => setAudioUrl(null)} className="p-3 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100">
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
