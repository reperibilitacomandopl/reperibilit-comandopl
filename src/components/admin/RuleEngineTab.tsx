"use client"

import { useState, useEffect } from "react"
import { Plus, Trash2, Save, AlertCircle, Wand2, RefreshCw } from "lucide-react"

type RuleType = "LIMIT" | "DISTANCE" | "SCORE_MODIFIER" | "FORBIDDEN_BASE_SHIFT"
type TargetRole = "AGENT" | "OFFICER" | "ALL"

export interface ShiftRule {
  id: string
  name: string
  type: RuleType
  targetRole: TargetRole
  config: string
  isActive: boolean
}

export default function RuleEngineTab() {
  const [rules, setRules] = useState<ShiftRule[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Form state per nuova regola
  const [showNewForm, setShowNewForm] = useState(false)
  const [newRule, setNewRule] = useState<{name: string, type: RuleType, targetRole: TargetRole, config: any}>({
    name: "",
    type: "LIMIT",
    targetRole: "ALL",
    config: {}
  })

  useEffect(() => {
    fetchRules()
  }, [])

  const fetchRules = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/rules")
      if (res.ok) {
        const data = await res.json()
        setRules(data)
      }
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Sicuro di voler eliminare questa regola? L'algoritmo non ne terrà più conto.")) return
    try {
      await fetch(`/api/admin/rules/${id}`, { method: "DELETE" })
      setRules(rules.filter(r => r.id !== id))
    } catch (e) {
      console.error(e)
    }
  }

  const handleToggleActive = async (rule: ShiftRule) => {
    try {
      const res = await fetch(`/api/admin/rules/${rule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !rule.isActive })
      })
      if (res.ok) {
        setRules(rules.map(r => r.id === rule.id ? { ...r, isActive: !rule.isActive } : r))
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleCreate = async () => {
    if (!newRule.name) return alert("Inserisci un nome per la regola")
    setSaving(true)
    try {
      const res = await fetch("/api/admin/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRule)
      })
      if (res.ok) {
        const created = await res.json()
        setRules([...rules, created])
        setShowNewForm(false)
        setNewRule({ name: "", type: "LIMIT", targetRole: "ALL", config: {} })
      }
    } catch (e) {
      console.error(e)
    }
    setSaving(false)
  }

  const renderConfigEditor = () => {
    switch (newRule.type) {
      case "DISTANCE":
        return (
          <div className="flex items-center gap-3 mt-3 bg-white p-4 rounded-xl border border-slate-200">
            <span className="text-sm font-bold text-slate-700">Distanza minima di</span>
            <input type="number" min="0" max="10" 
              className="w-20 border-2 border-slate-200 rounded-lg p-2 text-center"
              value={newRule.config.minDays || 2} 
              onChange={e => setNewRule({...newRule, config: {...newRule.config, minDays: parseInt(e.target.value)}})} 
            />
            <span className="text-sm font-bold text-slate-700">giorni tra due reperibilità.</span>
          </div>
        )
      case "LIMIT":
        return (
          <div className="flex items-center gap-3 mt-3 bg-white p-4 rounded-xl border border-slate-200">
            <span className="text-sm font-bold text-slate-700">Massimo</span>
            <input type="number" min="0" max="31" 
              className="w-20 border-2 border-slate-200 rounded-lg p-2 text-center"
              value={newRule.config.maxCount || 1} 
              onChange={e => setNewRule({...newRule, config: {...newRule.config, maxCount: parseInt(e.target.value)}})} 
            />
            <span className="text-sm font-bold text-slate-700">turni di tipo</span>
            <select className="border-2 border-slate-200 rounded-lg p-2"
              value={newRule.config.dayType || "SABATO"}
              onChange={e => setNewRule({...newRule, config: {...newRule.config, dayType: e.target.value}})}
            >
              <option value="SABATO">Sabato</option>
              <option value="DOMENICA">Domenica</option>
              <option value="FESTIVO">Qualsiasi Festivo</option>
            </select>
            <span className="text-sm font-bold text-slate-700">al mese.</span>
          </div>
        )
      case "SCORE_MODIFIER":
        return (
          <div className="flex flex-col gap-3 mt-3 bg-white p-4 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-slate-700">Se il turno base mattutino/pomeridiano è</span>
              <input type="text" placeholder="Es: M7, P14" 
                className="w-32 border-2 border-slate-200 rounded-lg p-2"
                value={newRule.config.baseShift || ""} 
                onChange={e => setNewRule({...newRule, config: {...newRule.config, baseShift: e.target.value.toUpperCase()}})} 
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-slate-700">Applica un modificatore di</span>
              <input type="number" 
                className="w-24 border-2 border-slate-200 rounded-lg p-2 text-center"
                value={newRule.config.score || 0} 
                onChange={e => setNewRule({...newRule, config: {...newRule.config, score: parseInt(e.target.value)}})} 
              />
              <span className="text-sm font-bold text-slate-700">punti.</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Punteggi NEGATIVI (-500) aumentano la priorità (Bonus). Punteggi POSITIVI (300) diminuiscono la priorità (Malus).</p>
          </div>
        )
      case "FORBIDDEN_BASE_SHIFT":
        return (
          <div className="flex items-center gap-3 mt-3 bg-white p-4 rounded-xl border border-slate-200">
            <span className="text-sm font-bold text-slate-700">VIETA la reperibilità se il turno base è</span>
            <input type="text" placeholder="Es: 104, FERIE" 
              className="w-32 border-2 border-slate-200 rounded-lg p-2"
              value={newRule.config.baseShift || ""} 
              onChange={e => setNewRule({...newRule, config: {...newRule.config, baseShift: e.target.value.toUpperCase()}})} 
            />
          </div>
        )
    }
  }

  const parseConfigDesc = (rule: ShiftRule) => {
    try {
      const cfg = JSON.parse(rule.config)
      if (rule.type === "DISTANCE") return `Distanza min: ${cfg.minDays} gg`
      if (rule.type === "LIMIT") return `Max ${cfg.maxCount} ${cfg.dayType}`
      if (rule.type === "SCORE_MODIFIER") return `Turno ${cfg.baseShift} -> Punteggio: ${cfg.score > 0 ? '+'+cfg.score : cfg.score}`
      if (rule.type === "FORBIDDEN_BASE_SHIFT") return `Vieta se turno base = ${cfg.baseShift}`
      return rule.config
    } catch {
      return rule.config
    }
  }

  if (loading) return <div className="p-10 flex justify-center"><RefreshCw className="animate-spin text-blue-500" /></div>

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-500">
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-4">
        <AlertCircle className="text-amber-500 shrink-0" />
        <div>
          <h3 className="font-bold text-amber-900 text-sm">Motore Regole Dinamico</h3>
          <p className="text-xs text-amber-700 mt-1">
            L'algoritmo di auto-compilazione leggerà queste regole per generare il calendario. 
            Modifica questi parametri con cautela: regole troppo restrittive potrebbero causare "buchi" nel tabellone.
          </p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest">Regole Attive</h3>
        <button 
          onClick={() => setShowNewForm(!showNewForm)}
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-800 transition-all"
        >
          {showNewForm ? "Annulla" : <><Plus size={16} /> Nuova Regola</>}
        </button>
      </div>

      {showNewForm && (
        <div className="bg-slate-50 border-2 border-blue-200 rounded-2xl p-6 shadow-lg">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Descrittivo</label>
              <input type="text" className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm focus:border-blue-500 outline-none"
                placeholder="Es. Max 1 Sabato" value={newRule.name} onChange={e => setNewRule({...newRule, name: e.target.value})} 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Target</label>
              <select className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm focus:border-blue-500 outline-none"
                value={newRule.targetRole} onChange={e => setNewRule({...newRule, targetRole: e.target.value as TargetRole})}
              >
                <option value="ALL">Tutti (Agenti e Ufficiali)</option>
                <option value="AGENT">Solo Agenti</option>
                <option value="OFFICER">Solo Ufficiali</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo di Regola</label>
              <select className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm focus:border-blue-500 outline-none font-bold"
                value={newRule.type} onChange={e => setNewRule({...newRule, type: e.target.value as RuleType, config: {}})}
              >
                <option value="LIMIT">Limite Quantitativo Mensile (es. Sabati)</option>
                <option value="DISTANCE">Distanziamento Temporale (es. Riposi)</option>
                <option value="SCORE_MODIFIER">Modificatore Punteggio (Bonus/Malus su turni base)</option>
                <option value="FORBIDDEN_BASE_SHIFT">Divieto Assoluto per Turno Base</option>
              </select>
            </div>
          </div>

          <div className="bg-slate-100 p-4 rounded-xl mb-6">
            <h4 className="text-xs font-black text-slate-500 uppercase mb-2">Configurazione Logica</h4>
            {renderConfigEditor()}
          </div>

          <button onClick={handleCreate} disabled={saving} className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white p-3 rounded-xl font-black uppercase tracking-widest hover:bg-blue-500 transition-all">
            {saving ? <RefreshCw className="animate-spin" /> : <Save size={18} />}
            Salva Nuova Regola
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        {rules.map(rule => (
          <div key={rule.id} className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${rule.isActive ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-60 grayscale'}`}>
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                rule.type === 'LIMIT' ? 'bg-rose-100 text-rose-600' :
                rule.type === 'DISTANCE' ? 'bg-blue-100 text-blue-600' :
                rule.type === 'SCORE_MODIFIER' ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 text-slate-700'
              }`}>
                <Wand2 size={18} />
              </div>
              <div>
                <h4 className="font-black text-slate-800 uppercase tracking-widest text-sm flex items-center gap-2">
                  {rule.name}
                  {!rule.isActive && <span className="bg-slate-200 text-slate-500 px-2 py-0.5 rounded text-[9px]">DISATTIVA</span>}
                </h4>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{rule.type}</span>
                  <span className="text-[10px] text-slate-500">{parseConfigDesc(rule)}</span>
                  <span className="text-[10px] text-slate-400 font-bold ml-2">Target: {rule.targetRole}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handleToggleActive(rule)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${rule.isActive ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
              >
                {rule.isActive ? "Disattiva" : "Attiva"}
              </button>
              <button 
                onClick={() => handleDelete(rule.id)}
                className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
        {rules.length === 0 && !loading && (
          <div className="text-center py-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
            <p className="text-slate-500 font-bold">Nessuna regola dinamica configurata.</p>
            <p className="text-xs text-slate-400 mt-1">L'algoritmo userà le regole di base standard.</p>
          </div>
        )}
      </div>
    </div>
  )
}
