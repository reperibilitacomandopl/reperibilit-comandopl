"use client"

import { useState, useEffect } from "react"
import { Calendar as CalendarIcon, Loader2, ChevronLeft, ChevronRight, Printer, X } from "lucide-react"

export default function ServiceOrderDashboard({ onClose }: { onClose?: () => void }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [showConfig, setShowConfig] = useState(false)
  
  const [users, setUsers] = useState<any[]>([])
  const [shifts, setShifts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  const loadData = async () => {
    setLoading(true)
    const y = currentDate.getFullYear()
    const m = String(currentDate.getMonth() + 1).padStart(2, "0")
    const d = String(currentDate.getDate()).padStart(2, "0")
    
    try {
      const res = await fetch(`/api/admin/shifts/daily?date=${y}-${m}-${d}`)
      const data = await res.json()
      if (data.users) setUsers(data.users)
      if (data.shifts) setShifts(data.shifts)
      if (data.categories) {
          setCategories(data.categories)
          setSelectedCategories(data.categories.map((c: any) => c.name))
      }
    } catch {}
    setLoading(false)
  }

  useEffect(() => { loadData() }, [currentDate])

  const changeDate = (days: number) => {
    const next = new Date(currentDate)
    next.setDate(next.getDate() + days)
    setCurrentDate(next)
  }

  const printDocument = () => {
    window.print()
  }

  // Raggruppiamo i turni in: MATTINO, POMERIGGIO, REPERIBILITA NOTTURNA + ASSENTI
  const isWorking = (type: string) => {
    const t = (type || "").toUpperCase().replace(/[()]/g, "").trim()
    return /^[MPN]\d/.test(t)
  }

  const presentShifts = shifts.filter(s => isWorking(s.type))
  const absentShifts = shifts.filter(s => !isWorking(s.type))
  const mattinieri = presentShifts.filter(s => /^M/i.test((s.type||"").replace(/[()]/g,"")))
  const pomeridiani = presentShifts.filter(s => /^P/i.test((s.type||"").replace(/[()]/g,"")))
  const reperibili = presentShifts.filter(s => s.repType != null && s.repType.includes("REP"))

  // Funzione helper per renderizzare una Macro Fascia Oraria (Mattino/Pomeriggio)
  const renderFascia = (titolo: string, listaTurni: any[]) => {
    if (listaTurni.length === 0) return null

    // Separa Ufficiali da Agenti
    const ufficiali = listaTurni.filter(s => {
        const u = users.find(user => user.id === s.userId);
        return u?.isUfficiale;
    });

    const agenti = listaTurni.filter(s => {
        const u = users.find(user => user.id === s.userId);
        return !u?.isUfficiale;
    });

    // Raggruppiamo gli AGENTI per ServiceCategory.name
    const gruppiAgenti: Record<string, any[]> = {}
    agenti.forEach(s => {
      const catName = s.serviceCategory ? s.serviceCategory.name : "ALTRI SERVIZI"
      if (!selectedCategories.includes(catName) && s.serviceCategory) return;
      if (!gruppiAgenti[catName]) gruppiAgenti[catName] = []
      gruppiAgenti[catName].push(s)
    })

    return (
      <div className="mb-0">
        <div className="bg-yellow-100/60 border-y-2 border-slate-300 text-center py-1">
          <h2 className="font-black text-blue-900 tracking-widest uppercase text-lg">{titolo}</h2>
        </div>

        {/* TABELLA UFFICIALI (Se presenti) */}
        {ufficiali.length > 0 && (
          <div className="border-b-2 border-slate-200">
            <div className="bg-blue-50 text-blue-800 py-1 px-4 text-[10px] font-black uppercase tracking-widest border-b border-slate-200">
              Ufficiali di Servizio / Coordinamento
            </div>
            <table className="w-full text-sm">
              <tbody>
                {ufficiali.map((s, idx) => renderShiftRow(s, idx))}
              </tbody>
            </table>
          </div>
        )}

        {/* GRUPPI AGENTI PER CATEGORIA */}
        {Object.entries(gruppiAgenti).map(([catName, servs]) => (
          <div key={catName}>
            <div className="bg-purple-100/50 border-b border-slate-200 text-center py-1 font-bold text-purple-900 italic text-xs">
              {catName}
            </div>
            <table className="w-full text-sm border-b border-slate-300">
              <tbody>
                {servs.map((s, idx) => {
                  // Se il turno precedente ha lo stesso patrolGroupId, visualizziamo senza il bordo superiore (o come blocco unico)
                  const prevShift = servs[idx - 1];
                  const isLinked = s.patrolGroupId && prevShift && s.patrolGroupId === prevShift.patrolGroupId;
                  return renderShiftRow(s, idx, isLinked);
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    )
  }

  // Helper per renderizzare la singola riga di turno (riutilizzabile)
  const renderShiftRow = (s: any, idx: number, isLinked: boolean = false) => {
    const u = users.find(u => u.id === s.userId)
    if (!u) return null
    const qualifica = u.qualifica || (u.isUfficiale ? "Uff.le" : "Agente")
    
    let orario = s.timeRange
    if (!orario && u.rotationGroup) {
      if (s.type.startsWith("M")) orario = `${u.rotationGroup.mStartTime}-${u.rotationGroup.mEndTime}`
      else if (s.type.startsWith("P")) orario = `${u.rotationGroup.pStartTime}-${u.rotationGroup.pEndTime}`
    }
    
    if (!orario) {
      const match = s.type.match(/([MP])(\d+)(?:,(\d+))?/)
      if (match) {
        const [,, h, m] = match
        const hour = h.padStart(2, "0")
        const min = (m || "00").padEnd(2, "0")
        const endHour = parseInt(h) + 6
        orario = `${hour}:${min}-${String(endHour).padStart(2, "0")}:${min}`
      } else {
        orario = (s.type.startsWith("M") ? "07:00-13:00" : s.type.startsWith("P") ? "14:00-20:00" : "-")
      }
    }
    
    // Se è collegato, nascondiamo il nome del servizio e il veicolo nella riga successiva per non duplicare
    const hideServiceInfo = isLinked;

    return (
      <tr key={s.id} className={`${idx % 2 === 0 ? "bg-white" : "bg-blue-50/20"} ${isLinked ? 'border-t border-dashed border-slate-200' : 'border-t border-slate-300'}`}>
        <td className={`py-1 px-4 border-r border-slate-200 w-1/4 font-semibold text-slate-800 ${isLinked ? 'pl-8' : ''}`}>
          {isLinked && <span className="text-slate-300 mr-2">↳</span>}
          <span className="text-[10px] text-slate-500 font-normal mr-2">{qualifica}</span>
          {u.name}
          {u.servizio && (
            <span className="ml-2 text-[9px] font-bold text-blue-700 bg-blue-100 border border-blue-200 px-1.5 py-0.5 rounded">
              {u.servizio}
            </span>
          )}
        </td>
        <td className="py-1 px-4 border-r border-slate-200 w-[120px] text-center font-mono text-xs">
          {orario}
        </td>
        <td className="py-1 px-4 w-1/2">
          {!hideServiceInfo ? (
            <>
              <span className="font-bold">{s.serviceType ? s.serviceType.name : (u.servizio ? u.servizio : "Servizio")}</span>
              {s.vehicle && <span className="ml-2 text-slate-600">({s.vehicle.name})</span>}
              {s.serviceDetails && <span className="ml-2 italic text-slate-500">- {s.serviceDetails}</span>}
            </>
          ) : (
            <span className="text-[10px] text-slate-400 italic">(Equipaggio sopra indicato)</span>
          )}
        </td>
      </tr>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-slate-50 rounded-3xl overflow-hidden shadow-2xl relative animate-in fade-in duration-300">
      
      {/* Header Stampante NASCOSTO IN STAMPA */}
      <div className="bg-slate-800 text-white p-4 flex items-center justify-between shrink-0 print:hidden">
        <div className="flex items-center gap-3">
          <CalendarIcon className="text-blue-400" />
          <h2 className="text-xl font-bold">Ordine di Servizio</h2>
        </div>
        
        <div className="flex items-center bg-slate-700 rounded-xl p-1">
          <button onClick={() => changeDate(-1)} className="p-2 hover:bg-slate-600 rounded-lg transition-colors"><ChevronLeft size={20}/></button>
          <div className="px-6 font-bold tracking-wide">
            {currentDate.toLocaleDateString("it-IT", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }).toUpperCase()}
          </div>
          <button onClick={() => changeDate(1)} className="p-2 hover:bg-slate-600 rounded-lg transition-colors"><ChevronRight size={20}/></button>
        </div>

        <div className="flex gap-2">
          <button onClick={() => setShowConfig(!showConfig)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-bold flex items-center gap-2">⚙️ Filtra Servizi</button>
          <button onClick={printDocument} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-bold flex items-center gap-2"><Printer size={16}/> Stampa PDF</button>
          {onClose && <button onClick={onClose} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg"><X size={20}/></button>}
        </div>
      </div>

      {/* PANNELLO CHECKLIST CATEGORIE (Simile alla foto) */}
      {showConfig && !loading && (
        <div className="bg-white border-b-4 border-slate-200 p-6 print:hidden shadow-inner max-h-64 overflow-y-auto">
           <h3 className="text-lg font-black text-slate-800 mb-4">Seleziona Servizi da visualizzare (Checklist)</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border border-slate-200 rounded-none overflow-hidden">
              {categories.map((c, i) => (
                <div 
                  key={c.id} 
                  onClick={() => {
                    if (selectedCategories.includes(c.name)) setSelectedCategories(selectedCategories.filter(x => x !== c.name))
                    else setSelectedCategories([...selectedCategories, c.name])
                  }}
                  className={`flex justify-between items-center p-3 border-b border-r border-slate-200 cursor-pointer hover:bg-blue-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}
                >
                  <span className="font-bold text-slate-900 text-sm">{c.name}</span>
                  {selectedCategories.includes(c.name) && (
                    <span className="text-black font-black text-lg">✔</span>
                  )}
                </div>
              ))}
           </div>
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center"><Loader2 size={40} className="animate-spin text-slate-400" /></div>
      ) : (
        <div className="flex-1 overflow-y-auto p-8 lg:p-12 print:p-0 bg-white" id="service-order-printable">
          {/* FOGLIO A4 STILE */}
          <div className="max-w-[210mm] min-h-[297mm] mx-auto bg-white print:shadow-none shadow-xl border border-slate-200 print:border-none p-10 print:p-6 print:m-0">
            
            {/* INTESTAZIONE STAMPA */}
            <div className="text-center mb-8 border-b-2 border-slate-800 pb-4">
              <h1 className="text-2xl font-black uppercase tracking-widest text-slate-900">Polizia Locale - Comune di Altamura</h1>
              <h2 className="text-xl font-bold mt-2 text-slate-700">Ordine di Servizio Giornaliero</h2>
              <h3 className="text-lg font-medium text-slate-600 mt-1 uppercase">
                {currentDate.toLocaleDateString("it-IT", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
              </h3>
            </div>

            {/* TABELLA */}
            <div className="border-2 border-slate-800">
              
              {renderFascia("MATTINO", mattinieri)}
              {renderFascia("POMERIGGIO", pomeridiani)}
              
              {/* SEZIONE REPERIBILITÀ */}
              {reperibili.length > 0 && (
                <div className="mb-0">
                  <div className="bg-slate-800 text-white border-y-2 border-slate-800 text-center py-1 mt-4">
                    <h2 className="font-black tracking-widest uppercase text-lg">REPERIBILITÀ NOTTURNA E PRONTA DISPONIBILITÀ</h2>
                  </div>
                  <table className="w-full text-sm">
                    <tbody>
                      {reperibili.map((s, idx) => {
                        const u = users.find(u => u.id === s.userId)
                        if (!u) return null
                        const qualifica = u.qualifica || (u.isUfficiale ? "Uff.le" : "Agente")
                        
                        return (
                          <tr key={s.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                            <td className="py-1.5 px-4 border-r border-slate-200 w-1/4 font-semibold text-slate-800">
                              <span className="text-[10px] text-slate-500 font-normal mr-2">{qualifica}</span>
                              {u.name}
                            </td>
                            <td className="py-1.5 px-4 border-r border-slate-200 w-[120px] text-center font-mono text-xs">
                              22:00 - 07:00
                            </td>
                            <td className="py-1.5 px-4 w-1/2 font-bold text-slate-700">
                              Reperibilità Notturna {s.repType === "REP 22-07" ? "" : `(${s.repType})`}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {(mattinieri.length === 0 && pomeridiani.length === 0 && reperibili.length === 0) && (
                <div className="p-10 text-center text-slate-400 font-bold italic">
                  Nessun servizio assegnato in questa data.
                </div>
              )}
            </div>

            {/* SEZIONE ASSENTI */}
            {absentShifts.length > 0 && (
              <div className="mt-8">
                <div className="bg-rose-50 border-2 border-rose-200 rounded-lg overflow-hidden">
                  <div className="bg-rose-500 text-white text-center py-2">
                    <h2 className="font-black tracking-widest uppercase text-sm">Personale Assente / Non Disponibile ({absentShifts.length})</h2>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {absentShifts.map(s => {
                        const u = users.find(u => u.id === s.userId)
                        if (!u) return null
                        return (
                          <div key={s.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-rose-100">
                            <div>
                              <span className="font-bold text-slate-800 text-sm">{u.name}</span>
                              {u.servizio && <span className="ml-2 text-[9px] font-bold text-rose-600 bg-rose-50 px-1 py-0.5 rounded">{u.servizio}</span>}
                            </div>
                            <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded">{s.type}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* FIRME */}
            <div className="mt-16 flex justify-end">
              <div className="text-center w-64">
                <p className="text-xs mb-12">Il Comandante</p>
                <div className="border-b border-slate-400 w-full mb-2"></div>
                <p className="text-[10px] uppercase text-slate-500 tracking-wider">Firma</p>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Tailwind utility classes for print styling */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #service-order-printable, #service-order-printable * {
            visibility: visible;
          }
          #service-order-printable {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}} />
    </div>
  )
}
