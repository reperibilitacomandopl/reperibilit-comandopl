"use client"

import { useState } from "react"
import toast from "react-hot-toast"
import { Clock, MapPin, Shield, Save, Navigation, CheckCircle2, XCircle, ArrowRightLeft, Map } from "lucide-react"

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

type Alert = {
  id: string
  message: string
  lat: number | null
  lng: number | null
  status: string
  date: string
  admin: { name: string }
}

export default function TimbratureClient({ initialRecords, tenantSettings, activeAlerts }: { initialRecords: Record[], tenantSettings: any, activeAlerts: Alert[] }) {
  const [records, setRecords] = useState(initialRecords)
  const [alerts, setAlerts] = useState<Alert[]>(activeAlerts || [])
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

  const handleResolveAlert = async (alertId: string) => {
    try {
      const res = await fetch(`/api/admin/alert-emergency/${alertId}`, {
        method: "PUT"
      })
      if (res.ok) {
        setAlerts(alerts.filter(a => a.id !== alertId))
        toast.success("Emergenza archiviata.")
      }
    } catch (err) {
      toast.error("Errore durante l'archiviazione.")
    }
  }

  return (
    <div className="p-4 lg:p-12 max-w-6xl mx-auto space-y-12 animate-fade-up">
      
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-slate-200 pb-10">
        <div className="space-y-4">
          <div className="flex items-center gap-4 mb-1">
            <div className="p-4 bg-emerald-600 rounded-2xl shadow-xl shadow-emerald-100 ring-1 ring-white/20">
              <Clock size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight text-slate-900 font-sans italic lowercase">timbrature <span className="text-emerald-600 not-italic uppercase">gps</span></h1>
              <p className="text-slate-500 font-medium mt-1">
                Monitora gli ingressi e le uscite con verifica della posizione in tempo reale.
              </p>
            </div>
          </div>
        </div>
        
        <div className="glass-effect px-5 py-2.5 rounded-2xl flex items-center gap-3 ring-1 ring-emerald-200 shadow-lg shadow-emerald-500/5">
           <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.6)]" />
           <span className="text-sm font-black text-emerald-700 font-sans uppercase tracking-widest leading-none mt-0.5">
             Monitoraggio Attivo
           </span>
        </div>
      </div>

      {/* EMERGENCY SOS BANNER (Sentinel) */}
      {alerts.length > 0 && (
        <div className="space-y-4 animate-in fade-in zoom-in duration-500">
          <h3 className="text-sm font-black text-rose-600 uppercase tracking-[0.3em] flex items-center gap-2">
            <span className="w-2 h-2 bg-rose-600 rounded-full animate-ping" />
            Emergenze Sentinel Attive
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alerts.map(alert => (
              <div key={alert.id} className="bg-white border-2 border-rose-500 rounded-3xl p-6 shadow-2xl shadow-rose-200 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Shield size={60} className="text-rose-600" />
                </div>
                <div className="flex justify-between items-start relative z-10">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-rose-600 text-white p-2 rounded-xl">
                        <ArrowRightLeft size={20} className="animate-pulse" />
                      </div>
                      <span className="text-lg font-black text-slate-900 tracking-tight">SOS da {alert.admin.name}</span>
                    </div>
                    <p className="text-rose-700 font-bold italic text-sm">{alert.message}</p>
                    <div className="flex items-center gap-4 text-[10px] font-black uppercase text-slate-400">
                       <span>{new Date(alert.date).toLocaleTimeString()}</span>
                       {alert.lat && <span>LOC: {alert.lat.toFixed(4)}, {alert.lng?.toFixed(4)}</span>}
                    </div>
                  </div>
                  <button 
                    onClick={() => handleResolveAlert(alert.id)}
                    className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black hover:bg-emerald-600 transition-colors shadow-lg"
                  >
                    ARCHIVIA
                  </button>
                </div>
                {alert.lat && (
                  <a 
                    href={`https://www.google.com/maps?q=${alert.lat},${alert.lng}`}
                    target="_blank"
                    className="mt-6 w-full flex items-center justify-center gap-3 bg-rose-50 border-2 border-rose-100 hover:bg-rose-100 py-4 rounded-2xl text-rose-700 font-black text-xs transition-all uppercase tracking-widest"
                  >
                    <Map size={24} /> VEDI POSIZIONE AGENTE ORA
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* Settings Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="premium-card p-8 border-t-4 border-t-emerald-500">
            <h2 className="text-lg font-black text-slate-900 font-sans flex items-center gap-3 mb-8">
              <Shield size={20} className="text-emerald-600" />
              Geofencing Setup
            </h2>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Latitudine Sede</label>
                <div className="relative">
                   <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
                      <MapPin size={16} />
                   </div>
                   <input 
                     type="number" 
                     step="any"
                     value={settings.lat}
                     onChange={(e) => setSettings({...settings, lat: parseFloat(e.target.value)})}
                     placeholder="Es: 40.8359"
                     className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-black text-slate-800 outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-sm font-sans"
                   />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Longitudine Sede</label>
                <div className="relative">
                   <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
                      <MapPin size={16} />
                   </div>
                   <input 
                     type="number" 
                     step="any"
                     value={settings.lng}
                     onChange={(e) => setSettings({...settings, lng: parseFloat(e.target.value)})}
                     placeholder="Es: 16.5512"
                     className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-black text-slate-800 outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-sm font-sans"
                   />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Raggio Tolleranza (Metri)</label>
                <div className="relative">
                   <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
                      <Navigation size={16} />
                   </div>
                   <input 
                     type="number" 
                     value={settings.clockInRadius}
                     onChange={(e) => setSettings({...settings, clockInRadius: parseInt(e.target.value)})}
                     className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-black text-slate-800 outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-sm font-sans"
                   />
                </div>
              </div>

              <button 
                onClick={handleSaveSettings}
                disabled={saving}
                className="w-full flex items-center justify-center gap-3 bg-emerald-600 hover:bg-slate-900 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all active:scale-95 disabled:opacity-50 mt-4"
              >
                {saving ? (
                   <div className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                   <Save size={20} />
                )}
                {saving ? "SALVATAGGIO..." : "SALVA CONFIG"}
              </button>

              <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                <p className="text-[11px] text-emerald-800 font-bold leading-relaxed italic text-center">
                  Geofencing impostato a <span className="underline decoration-emerald-300 decoration-2">{settings.clockInRadius}m</span>. 
                  Timbrature fuori raggio verranno segnalate.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Records Table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="premium-card overflow-hidden">
            <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="w-2 h-8 bg-emerald-500 rounded-full" />
                 <h2 className="text-xl font-black text-slate-900 font-sans tracking-tight">Ultime Timbrature</h2>
              </div>
              <span className="px-4 py-1.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest shadow-sm">
                {records.length} Record Caricati
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-white border-b border-slate-100">
                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Agente</th>
                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Data e Ora</th>
                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Tipo</th>
                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Posizione</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {records.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[14px] font-black text-slate-800 font-sans tracking-tight">{r.user.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono font-bold">MATR. {r.user.matricola}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[13px] font-bold text-slate-600 font-sans">
                            {new Date(r.timestamp).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" })}
                          </span>
                          <span className="text-[12px] text-emerald-600 font-black font-mono">
                            {new Date(r.timestamp).toLocaleTimeString("it-IT", { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 ${
                          r.type === 'IN' 
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                            : 'bg-rose-50 text-rose-600 border-rose-100'
                        }`}>
                          <ArrowRightLeft size={12} />
                          {r.type === 'IN' ? 'Entrata' : 'Uscita'}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        {r.lat && r.lng ? (
                          <div className="flex items-center gap-5">
                            <div className="flex flex-col gap-1">
                               <div className="flex items-center gap-1.5 text-slate-400 font-bold text-[10px]">
                                  <MapPin size={10} />
                                  <span>Acc: ±{Math.round(r.accuracy || 0)}m</span>
                               </div>
                               <a 
                                 href={`https://www.google.com/maps?q=${r.lat},${r.lng}`} 
                                 target="_blank" 
                                 className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 bg-indigo-50 px-3 py-1 rounded-lg transition-colors ring-1 ring-indigo-100 shadow-sm"
                               >
                                 <Map size={12} /> VEDI SU MAPPA
                               </a>
                            </div>
                            <CheckCircle2 size={24} className="text-emerald-500/30 group-hover:text-emerald-500 transition-colors" />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-rose-500 bg-rose-50 px-3 py-2 rounded-xl border border-rose-100 w-fit">
                            <XCircle size={16} />
                            <span className="text-[10px] font-black uppercase tracking-tight">Segnale GPS Assente</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {records.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-8 py-20 text-center">
                        <div className="flex flex-col items-center gap-4">
                           <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                              <Clock size={32} className="text-slate-200" />
                           </div>
                           <p className="text-slate-400 font-black text-sm font-sans uppercase tracking-widest italic">Nessuna timbratura registrata</p>
                        </div>
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
