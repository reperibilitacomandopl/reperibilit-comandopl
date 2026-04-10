"use client"

import { useState, useEffect, useMemo } from "react"
import { Calendar, Wand2, Save, Loader2, Users, ShieldAlert, Car, MapPin, Printer } from "lucide-react"
import toast from "react-hot-toast"
import { cacheDataset, getCachedDataset, storeOfflineRequest, syncOfflineRequests } from "@/lib/offline-sync"

export default function OdsDailyEditor() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [shifts, setShifts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // State for grouping singles into a patrol
  const [selectedForPatrol, setSelectedForPatrol] = useState<Set<string>>(new Set())

  const loadData = async () => {
    setLoading(true)
    try {
      if (navigator.onLine) {
        syncOfflineRequests()
      }

      const [resShifts, resCats, resVehs] = await Promise.all([
        fetch(`/api/admin/ods/daily?date=${date}`),
        fetch("/api/admin/services"),
        fetch("/api/admin/vehicles")
      ])
      const dataShifts = await resShifts.json()
      const dataCats = await resCats.json()
      const dataVehs = await resVehs.json()

      if (dataShifts.shifts) {
        setShifts(dataShifts.shifts)
        cacheDataset(`ods-shifts-${date}`, dataShifts.shifts)
      }
      if (dataCats.categories) {
        setCategories(dataCats.categories)
        cacheDataset('ods-categories', dataCats.categories)
      }
      if (dataVehs.vehicles) {
        setVehicles(dataVehs.vehicles)
        cacheDataset('ods-vehicles', dataVehs.vehicles)
      }
    } catch { 
      // Fallback offline
      const [cShifts, cCats, cVehs] = await Promise.all([
        getCachedDataset(`ods-shifts-${date}`),
        getCachedDataset('ods-categories'),
        getCachedDataset('ods-vehicles')
      ])
      if (cShifts) setShifts(cShifts)
      if (cCats) setCategories(cCats)
      if (cVehs) setVehicles(cVehs)
      
      toast.error("Offline: Caricamento dati dalla cache locale")
    }
    setLoading(false)
  }

  useEffect(() => { loadData() }, [date])

  const autoGenerate = async () => {
    if (!confirm("Verranno applicate le automazioni e sovrascritte le assegnazioni non salvate per questa data. Procedere?")) return
    setLoading(true)
    try {
      const res = await fetch("/api/admin/ods/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Magia applicata! ${data.count} turni assegnati in automatico.`)
        loadData()
      } else {
        toast.error(data.error || "Errore durante l'autocompilazione")
        setLoading(false)
      }
    } catch {
      toast.error("Impossibile autocompilare in modalità offline.")
      setLoading(false)
    }
  }

  const saveOds = async () => {
    setSaving(true)
    const updates = shifts.map(s => ({
      id: s.id,
      serviceCategoryId: s.serviceCategoryId,
      serviceTypeId: s.serviceTypeId,
      vehicleId: s.vehicleId,
      timeRange: s.timeRange,
      patrolGroupId: s.patrolGroupId,
      serviceDetails: s.serviceDetails
    }))

    try {
      const res = await fetch("/api/admin/ods/daily", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates })
      })
      
      if (res.ok) {
        toast.success("OdS Salvato con successo!")
        setSelectedForPatrol(new Set())
        cacheDataset(`ods-shifts-${date}`, shifts) // Aggiorna cache locale con i nuovi dati salvati
        loadData() 
      } else {
        const d = await res.json()
        throw new Error(d.error || "Errore salvataggio")
      }
    } catch (err: any) {
      console.warn('[PWA] Fallimento salvataggio OdS, tento parcheggio offline...', err)
      await storeOfflineRequest("/api/admin/ods/daily", "PUT", { updates })
      toast.success("⚠️ Offline: Modifiche OdS archiviate localmente. Verranno inviate appena torna il segnale.", { duration: 6000 })
      cacheDataset(`ods-shifts-${date}`, shifts) // Teniamo i dati locali coerenti con l'ultima modifica
    } finally {
      setSaving(false)
    }
  }

  const updateShift = (id: string, field: string, value: any) => {
    setShifts(prev => prev.map(s => s.id === id ? { ...s, [field]: value === "" ? null : value } : s))
  }

  const togglePatrolSelection = (id: string) => {
    setSelectedForPatrol(prev => {
      const nw = new Set(prev)
      if (nw.has(id)) nw.delete(id)
      else nw.add(id)
      return nw
    })
  }

  const handleGroupSelected = () => {
    if (selectedForPatrol.size < 2) return
    const groupId = crypto.randomUUID()
    setShifts(prev => prev.map(s => selectedForPatrol.has(s.id) ? { ...s, patrolGroupId: groupId } : s))
    setSelectedForPatrol(new Set())
    toast.success("Pattuglia formata temporaneamente. Ricorda di Salvare OdS!")
  }

  const groups = useMemo(() => {
    const map = new Map<string, any[]>()
    const singles: any[] = []
    const unavailable: any[] = []

    shifts.forEach(s => {
      const t = (s.type || "").toUpperCase().replace(/[()]/g, "").trim()
      // Turni operativi: M7, M7,30, M8, P14, P15, P16, S22, N22, ecc.
      // Riconosciamo come "in servizio" chi ha un codice che inizia con M/P/S/N seguito da un numero
      const isWorking = /^[MPN]\d/.test(t)

      if (!isWorking) {
        unavailable.push(s)
      } else if (s.patrolGroupId) {
        if (!map.has(s.patrolGroupId)) map.set(s.patrolGroupId, [])
        map.get(s.patrolGroupId)!.push(s)
      } else {
        singles.push(s)
      }
    })

    return { patrols: Array.from(map.values()), singles, unavailable }
  }, [shifts])

  return (
    <div className="space-y-8 animate-in fade-in max-w-7xl mx-auto px-4 lg:px-0">
      
      {/* HEADER */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
            <span className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl"><ShieldAlert size={28}/></span>
            Ordine di Servizio
          </h1>
          <p className="text-slate-500 font-medium ml-16 mt-1">
            Imposta l'allocazione giornaliera per il personale in servizio
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={18}/>
            <input 
              type="date" 
              value={date} 
              onChange={e => setDate(e.target.value)}
              className="pl-11 pr-4 py-3 bg-indigo-50 text-indigo-900 border border-indigo-100 font-black rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 shadow-inner"
            />
          </div>
          
          <button 
            onClick={autoGenerate}
            disabled={loading}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-black px-6 py-3 rounded-2xl hover:shadow-lg hover:shadow-indigo-500/30 transition-all active:scale-95 disabled:opacity-50"
          >
            <Wand2 size={18}/> {loading ? "Caricamento..." : "Autocompila OdS"}
          </button>
          
          <button 
            onClick={saveOds}
            disabled={loading || saving}
            className="flex items-center gap-2 bg-slate-900 text-white font-black px-6 py-3 rounded-2xl hover:bg-slate-800 transition-all shadow-md shadow-slate-900/20 active:scale-95 disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} Salva OdS
          </button>
          
          <button className="flex items-center justify-center p-3 text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 rounded-2xl transition-all" title="Stampa PDF" onClick={() => window.print()}>
             <Printer size={20} />
          </button>
        </div>
      </div>

      {loading && !saving ? (
        <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-indigo-600" size={40}/></div>
      ) : (
        <div className="space-y-8 print-friendly">
          
          {/* PATTUGLIE FISSE */}
          {groups.patrols.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest pl-2 border-l-4 border-indigo-500">Pattuglie (Gruppi)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groups.patrols.map((patrol, idx) => {
                  // Poiché sono raggruppati, mostriamo le info comuni (dal primo) e permettiamo di cambiarle a pioggia per tutti, oppure singolarmente
                  const p1 = patrol[0]
                  
                  return (
                    <div key={idx} className="bg-white border-2 border-indigo-100 rounded-[2rem] p-5 shadow-sm">
                      <div className="flex justify-between items-start mb-4 pb-4 border-b border-indigo-50">
                        <div className="space-y-2">
                          {patrol.map((member:any) => (
                            <div key={member.id} className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs shrink-0">
                                {member.user.matricola}
                              </div>
                              <div>
                                <p className="font-black text-slate-800 text-sm leading-tight">{member.user.name}</p>
                                <p className="font-bold text-slate-400 text-[10px]">
                                  {member.type}
                                  {member.user.servizio && <span className="ml-2 bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{member.user.servizio}</span>}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <button onClick={() => {
                          const conf = confirm("Vuoi separare questa pattuglia?")
                          if (conf) patrol.forEach(m => updateShift(m.id, 'patrolGroupId', null))
                        }} className="text-xs font-bold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors border border-red-100">
                          Separa Agenti
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1 mb-1"><MapPin size={10}/> Servizio</label>
                          <select value={p1.serviceCategoryId || ""} onChange={e => patrol.forEach(m => updateShift(m.id, 'serviceCategoryId', e.target.value))} className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 outline-none focus:border-indigo-500">
                            <option value="">-- Servizio --</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1 mb-1"><Car size={10}/> Veicolo</label>
                          <select value={p1.vehicleId || ""} onChange={e => patrol.forEach(m => updateShift(m.id, 'vehicleId', e.target.value))} className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 outline-none focus:border-indigo-500">
                            <option value="">-- Veicolo --</option>
                            {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                          </select>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <input type="text" placeholder="Orario (es. 07:00-13:00)" value={p1.timeRange || ""} onChange={e => patrol.forEach(m => updateShift(m.id, 'timeRange', e.target.value))} className="flex-1 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-indigo-500"/>
                        <input type="text" placeholder="Dettaglio o Zona" value={p1.serviceDetails || ""} onChange={e => patrol.forEach(m => updateShift(m.id, 'serviceDetails', e.target.value))} className="w-1/2 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-indigo-500"/>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* SINGOLI */}
          <div className="space-y-4">
            <div className="flex justify-between items-center pl-2">
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest border-l-4 border-slate-300 pl-2">Agenti Singoli ({groups.singles.length})</h3>
              {selectedForPatrol.size > 1 && (
                 <button onClick={handleGroupSelected} className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-4 py-2 rounded-xl transition-all shadow-md flex items-center gap-2">
                   <Users size={16} /> Crea Pattuglia da {selectedForPatrol.size} agenti
                 </button>
              )}
            </div>
            
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
               <table className="w-full text-left whitespace-nowrap min-w-[900px]">
                 <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                    <tr>
                      <th className="px-5 py-4">Agente e Turno</th>
                      <th className="px-5 py-4">Orari</th>
                      <th className="px-5 py-4">Servizio</th>
                      <th className="px-5 py-4">Dettagli</th>
                      <th className="px-5 py-4">Veicolo</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {groups.singles.map(s => (
                      <tr key={s.id} className={`hover:bg-slate-50/50 transition-colors ${selectedForPatrol.has(s.id) ? 'bg-indigo-50/50' : ''}`}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <input 
                              type="checkbox" 
                              checked={selectedForPatrol.has(s.id)} 
                              onChange={() => togglePatrolSelection(s.id)} 
                              className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                            />
                            <div className="flex flex-col">
                              <span className="font-black text-slate-800 text-sm">{s.user.name}</span>
                              <span className="text-xs font-bold text-slate-400">
                                Matr. {s.user.matricola} • <span className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">{s.type}</span>
                                {s.user.servizio && <span className="ml-1 bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">{s.user.servizio}</span>}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                           <input type="text" value={s.timeRange || ""} onChange={e => updateShift(s.id, 'timeRange', e.target.value)} placeholder="00:00-00:00" className="w-28 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-lg px-2 py-1.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex flex-col gap-1 w-48">
                            <select value={s.serviceCategoryId || ""} onChange={e => updateShift(s.id, 'serviceCategoryId', e.target.value)} className="w-full text-[10px] font-bold text-slate-900 bg-white border border-slate-300 rounded-lg px-2 py-1.5 outline-none focus:border-blue-500">
                              <option value="">Nessun Servizio</option>
                              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            {s.serviceCategoryId && (
                                <select value={s.serviceTypeId || ""} onChange={e => updateShift(s.id, 'serviceTypeId', e.target.value)} className="w-full text-[10px] font-bold text-indigo-700 bg-white border border-slate-300 rounded-lg px-2 py-1.5 outline-none focus:border-blue-500">
                                  <option value="">Generico</option>
                                  {categories.find((c:any) => c.id === s.serviceCategoryId)?.types.map((t:any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                           <input type="text" value={s.serviceDetails || ""} onChange={e => updateShift(s.id, 'serviceDetails', e.target.value)} placeholder="Zona/Dettaglio..." className="w-36 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-lg px-2 py-1.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                        </td>
                        <td className="px-5 py-3">
                          <select value={s.vehicleId || ""} onChange={e => updateShift(s.id, 'vehicleId', e.target.value)} className="w-36 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-lg px-2 py-1.5 outline-none focus:border-blue-500">
                            <option value="">A piedi / Nessuno</option>
                            {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                    {groups.singles.length === 0 && groups.unavailable.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 font-bold text-sm">Nessun agente trovato per questa data.</td>
                      </tr>
                    )}

                    {/* ASSENTI / NON DISPONIBILI — in fondo alla stessa tabella */}
                    {groups.unavailable.length > 0 && (
                      <>
                        <tr>
                          <td colSpan={5} className="bg-rose-500 text-white font-black text-xs uppercase tracking-widest px-5 py-2.5 border-t-2 border-rose-600">
                            ⛔ Assenti / Non Disponibili — {groups.unavailable.length} agenti (Riposo, Ferie, 104, Congedo, ecc.)
                          </td>
                        </tr>
                        {groups.unavailable.map(s => (
                          <tr key={s.id} className="bg-rose-50 hover:bg-rose-100/70 transition-colors">
                            <td className="px-5 py-2.5">
                              <div className="flex flex-col">
                                <span className="font-black text-slate-600 text-sm">{s.user.name}</span>
                                <span className="text-xs font-bold text-slate-400">
                                  Matr. {s.user.matricola}
                                  {s.user.servizio && <span className="ml-1 bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded border border-rose-200">{s.user.servizio}</span>}
                                </span>
                              </div>
                            </td>
                            <td className="px-5 py-2.5" colSpan={3}>
                              <span className="bg-rose-500 text-white font-black text-xs px-3 py-1 rounded-lg">
                                {s.type}
                              </span>
                            </td>
                            <td className="px-5 py-2.5 text-xs font-bold text-rose-400 italic">
                              Non in servizio
                            </td>
                          </tr>
                        ))}
                      </>
                    )}
                 </tbody>
               </table>
            </div>
          </div>

        </div>
      )}
      
      {/* CSS For Printing */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          .print-friendly, .print-friendly * { visibility: visible; }
          .print-friendly { position: absolute; left: 0; top: 0; width: 100%; padding: 20px;}
          input, select { border: none !important; -webkit-appearance: none; appearance: none; background: transparent !important; }
        }
      `}} />
    </div>
  )
}
