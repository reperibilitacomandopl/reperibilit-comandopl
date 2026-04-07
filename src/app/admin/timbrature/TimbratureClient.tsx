"use client"

import { useState } from "react"
import toast from "react-hot-toast"
import { Clock, MapPin, Shield, Save, Navigation, CheckCircle2, XCircle, ArrowRightLeft } from "lucide-react"

type Record = {
  id: string
  user: { name: string; matricola: string }
  timestamp: string
  type: string
  lat: number | null
  lng: number | null
  accuracy: number | null
  isVerified: boolean
}

export default function TimbratureClient({ initialRecords, tenantSettings }: { initialRecords: Record[], tenantSettings: any }) {
  const [records, setRecords] = useState(initialRecords)
  const [settings, setSettings] = useState({
    lat: tenantSettings?.lat || "",
    lng: tenantSettings?.lng || "",
    clockInRadius: tenantSettings?.clockInRadius || 500
  })
  const [saving, setSaving] = useState(false)

  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/tenant/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      })
      if (!res.ok) throw new Error("Errore salvataggio")
      toast.success("Impostazioni Geofencing aggiornate!")
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-emerald-100 rounded-xl">
              <Clock size={24} className="text-emerald-600" />
            </div>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-slate-800">
              Registro Timbrature GPS
            </h1>
          </div>
          <p className="text-slate-500 text-sm font-medium">
            Monitora gli ingressi e le uscite degli agenti con verifica della posizione.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Settings Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border-2 border-emerald-100 rounded-3xl p-6 shadow-xl shadow-emerald-900/5">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
              <Shield size={20} className="text-emerald-500" />
              Configurazione Geofence
            </h2>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Latitudine Sede</label>
                <input 
                  type="number" 
                  step="any"
                  value={settings.lat}
                  onChange={(e) => setSettings({...settings, lat: parseFloat(e.target.value)})}
                  placeholder="Es: 40.8359"
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Longitudine Sede</label>
                <input 
                  type="number" 
                  step="any"
                  value={settings.lng}
                  onChange={(e) => setSettings({...settings, lng: parseFloat(e.target.value)})}
                  placeholder="Es: 16.5512"
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Raggio Tolleranza (Metri)</label>
                <input 
                  type="number" 
                  value={settings.clockInRadius}
                  onChange={(e) => setSettings({...settings, clockInRadius: parseInt(e.target.value)})}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all"
                />
              </div>

              <button 
                onClick={handleSaveSettings}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-2xl font-black shadow-lg shadow-emerald-600/30 transition-all active:scale-95 disabled:opacity-50"
              >
                {saving ? "Salvataggio..." : <><Save size={18} /> Salva Configurazione</>}
              </button>

              <p className="text-[10px] text-slate-400 font-medium leading-relaxed italic text-center px-4">
                L'agente potrà timbrare solo se si trova entro {settings.clockInRadius}m dalle coordinate indicate.
              </p>
            </div>
          </div>
        </div>

        {/* Records Table */}
        <div className="lg:col-span-2">
          <div className="bg-white border-2 border-slate-100 rounded-3xl overflow-hidden shadow-xl shadow-slate-900/5">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Ultime Timbrature</h2>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-slate-500">
                  {records.length} Record
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Agente</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Data e Ora</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Posizione</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {records.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-700">{r.user.name}</span>
                          <span className="text-[10px] text-slate-400 font-medium">Matr. {r.user.matricola}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-600">
                            {new Date(r.timestamp).toLocaleDateString()}
                          </span>
                          <span className="text-[10px] text-emerald-600 font-black">
                            {new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                          r.type === 'IN' 
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                            : 'bg-rose-50 text-rose-600 border-rose-100'
                        }`}>
                          {r.type === 'IN' ? 'Entrata' : 'Uscita'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {r.lat && r.lng ? (
                          <div className="flex items-center gap-4">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-slate-500">Acc: ±{Math.round(r.accuracy || 0)}m</span>
                              <a 
                                href={`https://www.google.com/maps?q=${r.lat},${r.lng}`} 
                                target="_blank" 
                                className="text-[10px] font-black text-blue-500 hover:text-blue-700 underline underline-offset-4 flex items-center gap-1"
                              >
                                <Navigation size={10} /> Vedi Mappa
                              </a>
                            </div>
                            <CheckCircle2 size={18} className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-rose-500">
                            <XCircle size={16} />
                            <span className="text-[10px] font-black uppercase">Segnale Assente</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {records.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-medium italic">
                        Nessuna timbratura registrata nel periodo.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
