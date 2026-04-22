"use client"

import React, { useEffect, useState, useRef } from "react"
import { Shield, Users, MapPin, Navigation, Clock, RefreshCw } from "lucide-react"

interface AgentLocation {
  id: string
  name: string
  matricola: string
  qualifica: string
  lastLat: number
  lastLng: number
  lastSeenAt: string
}

export default function ControlRoomMap() {
  const [agents, setAgents] = useState<AgentLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markersRef = useRef<Record<string, any>>({})

  // Caricamento Leaflet da CDN
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)

    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.async = true
    script.onload = () => {
      if (mapContainerRef.current && !mapRef.current) {
        // @ts-ignore
        const L = window.L
        // Inizializza mappa (Centrata su Altamura come default, o l'Italia)
        mapRef.current = L.map(mapContainerRef.current).setView([40.8277, 16.5539], 14)
        
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution: '© OpenStreetMap contributors © CARTO',
          subdomains: 'abcd',
          maxZoom: 20
        }).addTo(mapRef.current)
      }
    }
    document.head.appendChild(script)

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
                <div class="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg border-2 border-white/20">
                  <span class="text-[10px] font-black">${agent.name.charAt(0)}</span>
                </div>
                <div class="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0f172a]"></div>
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
              <div class="flex items-center gap-2 text-[9px] text-emerald-600 font-black">
                <span class="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                LIVE · ${new Date(agent.lastSeenAt).toLocaleTimeString()}
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
    <div className="flex flex-col h-[calc(100vh-120px)] bg-slate-950 rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl relative">
      
      {/* Header Overlay */}
      <div className="absolute top-6 left-6 right-6 z-[1000] flex flex-col md:flex-row gap-4 pointer-events-none">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-2xl pointer-events-auto flex items-center gap-6">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
            <Navigation size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tighter">Centrale Operativa GPS</h2>
            <div className="flex items-center gap-4 mt-1">
              <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                Sistema Attivo
              </span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Ultimo Aggiornamento: {lastUpdate.toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-2xl pointer-events-auto flex items-center gap-8 ml-auto">
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Agenti in Rete</span>
            <span className="text-2xl font-black text-white">{agents.length}</span>
          </div>
          <div className="h-8 w-px bg-white/10"></div>
          <button 
            onClick={() => { setLoading(true); fetchLocations(); }}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white/40 hover:text-white transition-all"
            title="Aggiorna Mappa"
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Map Container */}
      <div ref={mapContainerRef} className="flex-1 z-0" />

      {/* Agents List Overlay (Desktop Only) */}
      <div className="absolute bottom-6 right-6 z-[1000] w-72 max-h-[400px] bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden hidden xl:flex flex-col pointer-events-auto">
        <div className="p-5 border-b border-white/5 flex items-center justify-between">
          <span className="text-[10px] font-black text-white uppercase tracking-widest">Lista Operativa</span>
          <Users size={14} className="text-slate-500" />
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
                <div className="w-8 h-8 bg-blue-600/20 rounded-xl flex items-center justify-center text-blue-400 font-black text-[10px] group-hover:bg-blue-600 group-hover:text-white transition-all">
                  {agent.name.charAt(0)}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-[11px] font-black text-white truncate uppercase">{agent.name}</p>
                  <p className="text-[9px] text-slate-500 font-bold uppercase truncate">{agent.qualifica || 'Agente'}</p>
                </div>
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Legend / Alert Overlay */}
      <div className="absolute bottom-6 left-6 z-[1000] pointer-events-none">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-full shadow-2xl pointer-events-auto flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-600"></div>
            <span className="text-[9px] font-black text-white uppercase tracking-widest">Pattuglia</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></div>
            <span className="text-[9px] font-black text-white uppercase tracking-widest">Allerta SOS</span>
          </div>
        </div>
      </div>
    </div>
  )
}
