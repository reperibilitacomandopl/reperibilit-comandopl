"use client"

import { useEffect, useState, useRef } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { Shield, CarFront, RadioTower, AlertTriangle } from "lucide-react"

// Fix icone leaflet default
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png"
})

// Custom HTML Icons
const createCustomIcon = (color: string, iconHtml: string) => {
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        border: 2px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
      ">
        ${iconHtml}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  })
}

// Icone per interventi
const redInterventionIcon = createCustomIcon("#ef4444", "<svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z'/><line x1='12' y1='9' x2='12' y2='13'/><line x1='12' y1='17' x2='12.01' y2='17'/></svg>")
const yellowInterventionIcon = createCustomIcon("#eab308", "<svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='10'/><line x1='12' y1='8' x2='12' y2='12'/><line x1='12' y1='16' x2='12.01' y2='16'/></svg>")
const greenInterventionIcon = createCustomIcon("#22c55e", "<svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='10'/><path d='m9 12 2 2 4-4'/></svg>")

// Icona per pattuglia
const patrolIcon = createCustomIcon("#3b82f6", "<svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a2 2 0 0 0-1.6-.8H5a2 2 0 0 0-2 2v7.2a2 2 0 0 0 2 2h2m7-8H5'/><circle cx='7' cy='16.5' r='2.5'/><circle cx='17' cy='16.5' r='2.5'/></svg>")

// Icona per SOS Allarme
const sosIcon = createCustomIcon("#dc2626", `
  <div style="position: relative; display: flex; align-items: center; justify-content: center;">
    <div style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background-color: #ef4444; opacity: 0.6; animation: ping 1.2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
    <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round' style="position: relative; z-index: 10;"><path d='m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z'/><line x1='12' y1='9' x2='12' y2='13'/><line x1='12' y1='17' x2='12.01' y2='17'/></svg>
  </div>
`)

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    if (center) {
      map.setView(center, 16, { animate: true })
    }
  }, [center, map])
  return null
}

interface MapProps {
  patrols: any[]
  interventions: any[]
  sosAlerts?: any[]
  onAssign: (interventionId: string, patrolId: string) => void
  center?: [number, number]
}

export default function LiveMap({ patrols, interventions, sosAlerts = [], onAssign, center = [40.8286, 16.5518] }: MapProps) {
  return (
    <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%", zIndex: 0 }}>
      <ChangeView center={center} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Marker SOS Allarmi */}
      {sosAlerts.filter(s => s.lat && s.lng).map(s => (
        <Marker key={s.id} position={[s.lat, s.lng]} icon={sosIcon}>
          <Popup>
            <div className="p-2 min-w-[220px]">
              <div className="flex items-center gap-1.5 text-red-600 font-black mb-1.5 animate-pulse">
                <AlertTriangle className="w-4 h-4"/>
                <span className="text-xs uppercase tracking-wider">ALLARME SOS ATTIVO</span>
              </div>
              <p className="font-bold text-sm text-slate-800">{s.admin?.name || 'Agente'}</p>
              {s.admin?.matricola && <p className="text-[10px] font-semibold text-slate-500 uppercase">Matricola: {s.admin.matricola}</p>}
              <p className="text-xs bg-red-50 text-red-900 border border-red-200 rounded p-1.5 my-2 font-medium">{s.message}</p>
              <p className="text-[9px] text-slate-400 font-mono">Data/Ora: {new Date(s.date).toLocaleString('it-IT')}</p>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Marker Pattuglie */}
      {patrols.filter(p => p.lat && p.lng).map(p => (
        <Marker key={p.userId} position={[p.lat, p.lng]} icon={patrolIcon}>
          <Popup>
            <div className="p-1">
              <p className="font-bold text-sm">{p.name} ({p.matricola})</p>
              {p.vehicle && <p className="text-xs text-gray-600 mt-1 flex items-center gap-1"><CarFront className="w-3 h-3"/> {p.vehicle}</p>}
              {p.radio && <p className="text-xs text-gray-600 flex items-center gap-1"><RadioTower className="w-3 h-3"/> {p.radio}</p>}
              <p className="text-[10px] text-gray-400 mt-2">Ultimo agg: {new Date(p.lastSeenAt).toLocaleTimeString()}</p>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Marker Interventi */}
      {interventions.filter(i => i.lat && i.lng).map(i => {
        let icon = greenInterventionIcon
        if (i.priority === 'RED') icon = redInterventionIcon
        if (i.priority === 'YELLOW') icon = yellowInterventionIcon

        return (
          <Marker key={i.id} position={[i.lat, i.lng]} icon={icon}>
            <Popup>
              <div className="p-1 min-w-[200px]">
                <p className="font-bold text-sm">{i.type}</p>
                <p className="text-xs text-gray-600 my-1">{i.address}</p>
                <p className="text-xs bg-gray-100 p-1 rounded my-2">{i.description}</p>
                <p className="text-xs font-semibold">Stato: {i.status}</p>
                {i.assignedTo ? (
                  <p className="text-xs text-blue-600 mt-1">Assegnato a: {i.assignedTo.name}</p>
                ) : (
                  <div className="mt-2 pt-2 border-t">
                    <p className="text-xs mb-1 text-gray-500">Assegna pattuglia:</p>
                    <select 
                      className="w-full text-xs p-1 border rounded"
                      onChange={(e) => {
                         if(e.target.value) onAssign(i.id, e.target.value)
                      }}
                      value=""
                    >
                      <option value="" disabled>-- Seleziona --</option>
                      {patrols.map(p => (
                        <option key={p.userId} value={p.userId}>{p.name} {p.vehicle ? `(${p.vehicle})` : ''}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
