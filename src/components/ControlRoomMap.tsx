"use client"

import React, { useEffect, useState, useRef } from "react"
import { Shield, Users, MapPin, Navigation, Clock, RefreshCw, AlertTriangle } from "lucide-react"

interface AgentLocation {
  id: string
  name: string
  matricola: string
  qualifica: string
  lastLat: number
  lastLng: number
  lastSeenAt: string
  isSosActive?: boolean
}

export default function ControlRoomMap() {
  const [agents, setAgents] = useState<AgentLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [mapError, setMapError] = useState(false)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markersRef = useRef<Record<string, any>>({})

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
          marker.bindPopup(`
            <div class="p-2">
              <h4 class="font-black text-slate-900 uppercase text-xs">${agent.name}</h4>
              <p class="text-[10px] text-slate-500 font-bold uppercase mb-2">${agent.qualifica || 'Agente'}</p>
              <div class="flex items-center gap-2 text-[9px] ${agent.isSosActive ? 'text-rose-600' : 'text-emerald-600'} font-black">
                <span class="w-1.5 h-1.5 ${agent.isSosActive ? 'bg-rose-500' : 'bg-emerald-500'} rounded-full animate-pulse"></span>
                ${agent.isSosActive ? 'EMERGENZA SOS' : 'LIVE'} · ${new Date(agent.lastSeenAt).toLocaleTimeString()}
              </div>
            </div>
          `)
          markersRef.current[agent.id] = marker
        }
      }
    })
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
                  <p className="text-[11px] font-black text-slate-900 truncate uppercase">{agent.name}</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase truncate">{agent.qualifica || 'Agente'}</p>
                </div>
                <div className={`w-2 h-2 rounded-full ${agent.isSosActive ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)] animate-pulse' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`}></div>
              </button>
            ))
          )}
        </div>
      </div>

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
