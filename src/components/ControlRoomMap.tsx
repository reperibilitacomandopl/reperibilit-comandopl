"use client"

import React, { useEffect, useState, useRef } from "react"
import { Shield, Users, MapPin, Navigation, Clock, RefreshCw, AlertTriangle, CheckCircle, Mic, Square, MessageSquare, Send, X } from "lucide-react"
import toast from "react-hot-toast"

interface AgentLocation {
  id: string
  name: string
  matricola: string
  qualifica: string
  lastLat: number
  lastLng: number
  lastSeenAt: string
  isSosActive?: boolean
  activeAlertId?: string | null
  telegramChatId?: string | null
}

export default function ControlRoomMap() {
  const [agents, setAgents] = useState<AgentLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [mapError, setMapError] = useState(false)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markersRef = useRef<Record<string, any>>({})
  const [selectedAgent, setSelectedAgent] = useState<AgentLocation | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  // Inizializzazione Mappa
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initMap = () => {
      // @ts-ignore
      const L = window.L
      if (!L) {
        setMapError(true)
        return
      }
      if (!mapContainerRef.current || mapRef.current) return

      try {
        mapRef.current = L.map(mapContainerRef.current).setView([40.8277, 16.5539], 14)
        
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          attribution: '© OpenStreetMap contributors © CARTO',
          subdomains: 'abcd',
          maxZoom: 20
        }).addTo(mapRef.current)
        
        // Carica posizioni iniziali
        fetchLocations()
      } catch (e) {
        console.error("Map init error:", e)
        setMapError(true)
      }
    }

    // @ts-ignore
    if (window.L) {
      initMap()
    } else {
      let attempts = 0
      const checkL = setInterval(() => {
        attempts++
        // @ts-ignore
        if (window.L) {
          initMap()
          clearInterval(checkL)
        } else if (attempts > 50) { // Smetti dopo 5 secondi
          setMapError(true)
          clearInterval(checkL)
        }
      }, 100)
      return () => clearInterval(checkL)
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  const fetchLocations = async () => {
    try {
      const res = await fetch("/api/admin/agents-location")
      const data = await res.json()
      if (data.success) {
        setAgents(data.agents)
        setLastUpdate(new Date())
        updateMarkers(data.agents)
      }
    } catch (err) {
      console.error("Error fetching locations:", err)
    } finally {
      setLoading(false)
    }
  }

  const updateMarkers = (agentData: AgentLocation[]) => {
    // @ts-ignore
    const L = window.L
    if (!L || !mapRef.current) return

    // Rimuovi marker di agenti non più in servizio
    const currentIds = agentData.map(a => a.id)
    Object.keys(markersRef.current).forEach(id => {
      if (!currentIds.includes(id)) {
        markersRef.current[id].remove()
        delete markersRef.current[id]
      }
    })

    // Aggiungi o aggiorna marker
    agentData.forEach(agent => {
      if (agent.lastLat && agent.lastLng) {
        const pos: [number, number] = [agent.lastLat, agent.lastLng]
        
        if (markersRef.current[agent.id]) {
          markersRef.current[agent.id].setLatLng(pos)
        } else {
          const icon = L.divIcon({
            className: 'custom-div-icon',
            html: `
              <div class="relative">
                <div class="w-10 h-10 ${agent.isSosActive ? 'bg-rose-600 animate-pulse' : 'bg-blue-600'} rounded-2xl flex items-center justify-center text-white shadow-lg border-2 border-white/20">
                  <span class="text-[10px] font-black">${agent.name.charAt(0)}</span>
                </div>
                <div class="absolute -bottom-1 -right-1 w-3 h-3 ${agent.isSosActive ? 'bg-rose-500 animate-ping' : 'bg-emerald-500'} rounded-full border-2 border-white"></div>
              </div>
            `,
            iconSize: [40, 40],
            iconAnchor: [20, 40]
          })

          const marker = L.marker(pos, { icon }).addTo(mapRef.current)
          marker.on('click', () => {
            setSelectedAgent(agent)
          })
          marker.bindPopup(`
            <div class="p-2 min-w-[150px]">
              <h4 class="font-black text-slate-900 uppercase text-xs">${agent.name}</h4>
              <p class="text-[10px] text-slate-500 font-bold uppercase mb-2">${agent.qualifica || 'Agente'}</p>
              <div class="flex items-center gap-2 text-[9px] ${agent.isSosActive ? 'text-rose-600' : 'text-emerald-600'} font-black mb-3">
                <span class="w-1.5 h-1.5 ${agent.isSosActive ? 'bg-rose-500' : 'bg-emerald-500'} rounded-full animate-pulse"></span>
                ${agent.isSosActive ? 'EMERGENZA SOS' : 'LIVE'} · ${new Date(agent.lastSeenAt).toLocaleTimeString()}
              </div>
              ${agent.isSosActive ? `
                <button 
                  onclick="document.getElementById('agent-${agent.id}-resolve')?.click()"
                  class="w-full bg-emerald-600 text-white text-[9px] font-black py-1.5 rounded-lg uppercase tracking-widest shadow-lg shadow-emerald-500/20"
                >
                  Risolvi SOS
                </button>
              ` : ''}
            </div>
          `)
          markersRef.current[agent.id] = marker
        }
      }
    })
  }

  const resolveSos = async (alertId: string) => {
    try {
      const res = await fetch("/api/admin/alert-emergency", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId, status: "RESOLVED" })
      })
      if (res.ok) {
        toast.success("SOS risolto correttamente")
        fetchLocations()
      }
    } catch (err) {
      toast.error("Errore durante la risoluzione dell'SOS")
    }
  }

  // Registrazione Vocale
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream)
      audioChunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setRecordingBlob(blob)
        stream.getTracks().forEach(t => t.stop())
      }

      mediaRecorderRef.current.start()
      setIsRecording(true)
      setRecordingBlob(null)
    } catch (err) {
      toast.error("Errore accesso microfono")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const sendVoiceMessage = async (agent: AgentLocation) => {
    if (!recordingBlob) return
    
    const toastId = toast.loading("Invio messaggio vocale...")
    try {
      const reader = new FileReader()
      reader.readAsDataURL(recordingBlob)
      reader.onloadend = async () => {
        const base64Audio = reader.result as string
        
        const res = await fetch("/api/admin/alert-emergency", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            type: "SOS", // Riutilizziamo lo stesso endpoint o uno dedicato
            userId: agent.id,
            audio: base64Audio,
            message: `🎧 Messaggio vocale dalla Centrale Operativa`
          })
        })

        if (res.ok) {
          toast.success("Messaggio inviato", { id: toastId })
          setRecordingBlob(null)
        } else {
          throw new Error()
        }
      }
    } catch (err) {
      toast.error("Errore invio messaggio", { id: toastId })
    }
  }

  useEffect(() => {
    fetchLocations()
    const interval = setInterval(fetchLocations, 30000) // Aggiorna ogni 30s
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] bg-slate-50 rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-2xl relative">
      {mapError && (
        <div className="absolute inset-0 z-[2000] bg-white/90 flex flex-col items-center justify-center p-8 text-center">
          <AlertTriangle size={48} className="text-amber-500 mb-4" />
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Errore Caricamento Mappa</h3>
          <p className="text-slate-500 text-sm mt-2 max-w-md">Impossibile caricare le librerie cartografiche. Controlla la tua connessione o riprova più tardi.</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-xl transition-all"
          >
            Ricarica Pagina
          </button>
        </div>
      )}
      
      {/* Header Overlay */}
      <div className="absolute top-6 left-6 right-6 z-[1000] flex flex-col md:flex-row gap-4 pointer-events-none">
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200 p-6 rounded-3xl shadow-2xl pointer-events-auto flex items-center gap-6">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
            <Navigation size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Centrale Operativa GPS</h2>
            <div className="flex items-center gap-4 mt-1">
              <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                Sistema Attivo
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Ultimo Aggiornamento: {lastUpdate.toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl border border-slate-200 p-6 rounded-3xl shadow-2xl pointer-events-auto flex items-center gap-8 ml-auto">
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Agenti in Rete</span>
            <span className="text-2xl font-black text-slate-900">{agents.length}</span>
          </div>
          <div className="h-8 w-px bg-slate-200"></div>
          <button 
            onClick={() => { setLoading(true); fetchLocations(); }}
            className="p-3 bg-slate-100 hover:bg-slate-200 rounded-2xl text-slate-400 hover:text-slate-600 transition-all"
            title="Aggiorna Mappa"
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Map Container */}
      <div ref={mapContainerRef} className="flex-1 z-0" />

      {/* Agents List Overlay (Desktop Only) */}
      <div className="absolute bottom-6 right-6 z-[1000] w-72 max-h-[400px] bg-white/80 backdrop-blur-xl border border-slate-200 rounded-[2rem] shadow-2xl overflow-hidden hidden xl:flex flex-col pointer-events-auto">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Lista Operativa</span>
          <Users size={14} className="text-slate-400" />
        </div>
        <div className="overflow-y-auto custom-scrollbar p-2 space-y-1">
          {agents.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-[10px] font-bold text-slate-500 uppercase">Nessun agente attivo</p>
            </div>
          ) : (
            agents.map(agent => (
              <button
                key={agent.id}
                onClick={() => {
                  if (mapRef.current && agent.lastLat && agent.lastLng) {
                    mapRef.current.flyTo([agent.lastLat, agent.lastLng], 17)
                    markersRef.current[agent.id]?.openPopup()
                  }
                }}
                className="w-full flex items-center gap-3 p-3 hover:bg-white/5 rounded-2xl transition-all text-left group"
              >
                <div className={`w-8 h-8 ${agent.isSosActive ? 'bg-rose-600' : 'bg-blue-600/20'} rounded-xl flex items-center justify-center ${agent.isSosActive ? 'text-white' : 'text-blue-600'} font-black text-[10px] group-hover:bg-blue-600 group-hover:text-white transition-all`}>
                  {agent.name.charAt(0)}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] font-black text-slate-900 truncate uppercase">{agent.name}</p>
                    {agent.isSosActive && <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></div>}
                  </div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase truncate">{agent.qualifica || 'Agente'}</p>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {agent.isSosActive && (
                    <button
                      id={`agent-${agent.id}-resolve`}
                      onClick={(e) => { e.stopPropagation(); resolveSos(agent.activeAlertId!); }}
                      className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all"
                      title="Risolvi SOS"
                    >
                      <CheckCircle size={14} />
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedAgent(agent); }}
                    className="p-1.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all"
                    title="Comunicazioni"
                  >
                    <MessageSquare size={14} />
                  </button>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Agent Detail / Communication Modal */}
      {selectedAgent && (
        <div className="absolute inset-x-6 bottom-24 z-[1100] md:left-auto md:right-6 md:w-80 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-[2rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${selectedAgent.isSosActive ? 'bg-rose-600' : 'bg-blue-600'} rounded-xl flex items-center justify-center text-white font-black text-xs`}>
                {selectedAgent.name.charAt(0)}
              </div>
              <div>
                <p className="text-xs font-black text-slate-900 uppercase">{selectedAgent.name}</p>
                <p className="text-[9px] text-slate-500 font-bold uppercase">{selectedAgent.qualifica || 'Agente'}</p>
              </div>
            </div>
            <button onClick={() => setSelectedAgent(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-all">
              <X size={16} />
            </button>
          </div>
          
          <div className="p-5 space-y-4">
            {selectedAgent.isSosActive && (
              <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl">
                <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <AlertTriangle size={12} />
                  SOS Attivo da {new Date(selectedAgent.lastSeenAt).toLocaleTimeString()}
                </p>
                <button
                  onClick={() => resolveSos(selectedAgent.activeAlertId!)}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-rose-500/20 transition-all"
                >
                  Risolvi e Spegni Allarme
                </button>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Comandi Rapidi</p>
              
              <div className="flex flex-col gap-2">
                {!isRecording && !recordingBlob && (
                  <button
                    onClick={startRecording}
                    className="flex items-center gap-3 w-full p-3 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-2xl border border-slate-100 transition-all group"
                  >
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                      <Mic size={16} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest">Registra Vocale</span>
                  </button>
                )}

                {isRecording && (
                  <button
                    onClick={stopRecording}
                    className="flex items-center justify-between w-full p-3 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 animate-pulse"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-rose-600 rounded-lg flex items-center justify-center text-white">
                        <Square size={16} />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest">In Registrazione...</span>
                    </div>
                    <span className="text-[10px] font-bold">Clicca per fermare</span>
                  </button>
                )}

                {recordingBlob && !isRecording && (
                  <div className="space-y-2">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100 flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest">Audio Pronto</span>
                      <button onClick={() => setRecordingBlob(null)} className="text-[9px] font-bold underline">Annulla</button>
                    </div>
                    <button
                      onClick={() => sendVoiceMessage(selectedAgent)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                    >
                      <Send size={16} />
                      Invia Messaggio Vocale
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Legend / Alert Overlay */}
      <div className="absolute bottom-6 left-6 z-[1000] pointer-events-none">
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200 px-4 py-2 rounded-full shadow-2xl pointer-events-auto flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-600"></div>
            <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest">Pattuglia</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></div>
            <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest">Allerta SOS</span>
          </div>
        </div>
      </div>
    </div>
  )
}
