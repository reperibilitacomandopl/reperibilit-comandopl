"use client"

import { useState, useEffect } from "react"
import { Loader2, Save, RotateCcw, AlertTriangle, ArrowRight, CheckCircle, Info, Hash } from "lucide-react"
import toast from "react-hot-toast"
import { AGENDA_CATEGORIES, getUnit } from "../utils/agenda-codes"

export default function AdminInitialBalances() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [agents, setAgents] = useState<any[]>([])
  const [year, setYear] = useState(new Date().getFullYear())
  const [grid, setGrid] = useState<Record<string, Record<string, number>>>({})
  const [originalGrid, setOriginalGrid] = useState<Record<string, Record<string, number>>>({})
  const [usage, setUsage] = useState<any>(null)

  // Solo i codici che vogliamo gestire come "Saldi Iniziali" (Ferie, 104, Congedi, Straord)
  const relevantItems = AGENDA_CATEGORIES.flatMap(cat => cat.items).filter(item => 
    ["0015", "0016", "0010", "0112", "0111", "0110", "0098", "0095", "0097", "0096", "0031", "0038", "0014", "0002", "0004", "0005", "0009"].includes(item.code)
  )

  useEffect(() => {
    loadData()
  }, [year])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/balances?year=${year}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      setAgents(data.agents || [])
      setUsage(data.usage)

      // Costruisci il form state
      const initialGrid: Record<string, Record<string, number>> = {}
      data.agents.forEach((ag: any) => {
        initialGrid[ag.id] = {}
        relevantItems.forEach(item => {
          const balance = data.balances.find((b: any) => b.userId === ag.id)
          const detail = balance?.details.find((d: any) => d.code === item.code)
          initialGrid[ag.id][item.code] = detail?.initialValue || 0
        })
      })
      setGrid(JSON.parse(JSON.stringify(initialGrid)))
      setOriginalGrid(JSON.parse(JSON.stringify(initialGrid)))
    } catch (err: any) {
      toast.error(err.message || "Errore caricamento")
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (agentId: string, code: string, val: string) => {
    const num = parseFloat(val) || 0
    setGrid(prev => ({
      ...prev,
      [agentId]: {
        ...prev[agentId],
        [code]: num
      }
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    const updates: any[] = []

    Object.keys(grid).forEach(userId => {
      relevantItems.forEach(item => {
        if (grid[userId][item.code] !== originalGrid[userId][item.code]) {
          updates.push({
            userId,
            code: item.code,
            label: item.label,
            initialValue: grid[userId][item.code],
            unit: getUnit(item.code)
          })
        }
      })
    })

    if (updates.length === 0) {
      toast("Nessuna modifica da salvare", { icon: "ℹ️" })
      setSaving(false)
      return
    }

    try {
      const res = await fetch("/api/admin/balances", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, updates })
      })
      if (res.ok) {
        toast.success(`Salvati ${updates.length} valori!`)
        loadData()
      } else {
        throw new Error()
      }
    } catch {
      toast.error("Errore durante il salvataggio")
    } finally {
      setSaving(false)
    }
  }

  const handleCarryOver = async () => {
    if (!confirm(`Vuoi riportare i saldi residui di ferie (0015) dall'anno ${year - 1} all'anno ${year} (come Ferie Anni Precedenti 0016)?`)) return
    
    setSaving(true)
    try {
      const res = await fetch("/api/admin/balances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromYear: year - 1, toYear: year })
      })
      const data = await res.json()
      if (data.success) {
        toast.success(data.message)
        loadData()
      } else {
        throw new Error(data.error)
      }
    } catch (err: any) {
      toast.error(err.message || "Errore riporto saldi")
    } finally {
      setSaving(false)
    }
  }

  const calculateUsed = (userId: string, code: string) => {
    if (!usage) return 0
    const item = relevantItems.find(i => i.code === code)
    if (!item) return 0

    if (item.unit === "HOURS") {
      const agenda = usage.agendaSums.find((s: any) => s.userId === userId && s.code === code)
      return agenda?._sum.hours || 0
    } else {
      const shifts = usage.shiftsCount.find((s: any) => s.userId === userId && s.type === code)
      return shifts?._count._all || 0
    }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 gap-4">
      <Loader2 className="animate-spin text-blue-600" size={40} />
      <p className="text-slate-500 font-bold animate-pulse">Caricamento Saldi Iniziali...</p>
    </div>
  )

  const hasChanges = JSON.stringify(grid) !== JSON.stringify(originalGrid)

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Hash className="text-blue-600" size={28} />
            Gestione Saldi Iniziali <span className="text-blue-600">{year}</span>
          </h1>
          <p className="text-slate-500 text-sm font-medium">Configura i valori spettanti ad inizio anno per ogni agente.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button onClick={() => setYear(year - 1)} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-600"><RotateCcw size={16} /></button>
            <span className="px-4 font-black text-slate-900">{year}</span>
            <button onClick={() => setYear(year + 1)} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-600 rotate-180"><RotateCcw size={16} /></button>
          </div>

          <button 
            onClick={handleCarryOver}
            className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-black transition-all shadow-lg shadow-slate-200"
          >
            <ArrowRight size={16} /> Riporto {year-1}
          </button>

          <button 
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-lg ${hasChanges ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200 animate-pulse' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
          >
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} 
            Salva Modifiche
          </button>
        </div>
      </div>

      {/* Grid Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 font-black text-slate-500 uppercase text-[10px] tracking-widest sticky left-0 bg-slate-50 z-20 w-48 border-r">Agente</th>
                {relevantItems.map(item => (
                  <th key={item.code} className="p-4 font-black text-slate-500 uppercase text-[10px] tracking-widest min-w-[120px] text-center border-r last:border-r-0">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-slate-900 text-xs">{item.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[9px]">{item.code}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${item.unit === 'HOURS' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {item.unit === 'HOURS' ? 'ORE (H)' : 'GIORNI (G)'}
                        </span>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agents.map((agent, agentIdx) => (
                <tr key={agent.id} className={`${agentIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'} hover:bg-blue-50/50 transition-colors border-b last:border-0`}>
                  <td className={`p-4 font-black text-slate-900 border-r whitespace-nowrap sticky left-0 z-10 text-xs ${agentIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                    <div className="flex flex-col">
                      <span>{agent.name}</span>
                      <span className="text-[10px] text-slate-400 font-medium">MATR. {agent.matricola}</span>
                    </div>
                  </td>
                  {relevantItems.map(item => {
                    const initial = grid[agent.id][item.code] || 0
                    const used = calculateUsed(agent.id, item.code)
                    const remaining = initial - used
                    const isChanged = grid[agent.id][item.code] !== originalGrid[agent.id][item.code]

                    return (
                      <td key={item.code} className={`p-3 border-r last:border-r-0 transition-colors ${isChanged ? 'bg-amber-50/50' : ''}`}>
                        <div className="flex flex-col gap-2">
                          <input 
                            type="number"
                            step={item.unit === 'HOURS' ? '0.5' : '1'}
                            value={initial || ""}
                            onChange={(e) => handleChange(agent.id, item.code, e.target.value)}
                            placeholder="0"
                            className={`w-full bg-white border rounded-lg px-3 py-1.5 text-center text-sm font-black focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isChanged ? 'border-amber-400 text-amber-700' : 'border-slate-200 text-slate-900'}`}
                          />
                          <div className="flex items-center justify-between px-1">
                            <div className="flex flex-col items-center">
                              <span className="text-[9px] text-slate-400 font-bold uppercase">Usate</span>
                              <span className="text-[10px] font-black text-rose-600">{used}</span>
                            </div>
                            <div className="h-4 w-px bg-slate-200"></div>
                            <div className="flex flex-col items-center">
                              <span className="text-[9px] text-slate-400 font-bold uppercase">Residuo</span>
                              <span className={`text-[10px] font-black ${remaining < 0 ? 'text-red-600' : remaining === 0 ? 'text-slate-400' : 'text-emerald-600'}`}>
                                {remaining}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3 text-blue-700">
        <Info size={20} className="shrink-0 mt-0.5" />
        <div className="text-xs font-medium leading-relaxed">
          <p className="font-black mb-1 text-blue-800 uppercase tracking-wider">Istruzioni</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Il valore inserito è il saldo <b>spettante</b> ad inizio anno.</li>
            <li>Le <b>"Usate"</b> vengono calcolate automaticamente contando i turni/assenze inseriti nel calendario per quel particolare codice.</li>
            <li>Il pulsante <b>"Riporto"</b> sposta le ore/giorni residui dell'anno scorso nel codice "Ferie Anni Precedenti (0016)".</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
