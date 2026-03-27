"use client"

import { useState, useEffect, useCallback } from "react"
import { Settings, Users, Shield, Mail, Plus, Trash2, X, Save, Eye, EyeOff, ChevronDown, AlertCircle } from "lucide-react"

type Agent = {
  id: string; name: string; matricola: string; isUfficiale: boolean;
  massimale: number; email: string | null; phone: string | null
}

type SettingsData = {
  minUfficiali: number; usaProporzionale: boolean;
  meseCorrente: number; annoCorrente: number
}

type PecConfig = {
  host: string; port: string; user: string; pass: string; from: string
}

export default function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<"algorithm" | "pec">("algorithm")
  const [settings, setSettings] = useState<SettingsData>({ minUfficiali: 1, usaProporzionale: true, meseCorrente: 4, annoCorrente: 2026 })
  const [agents, setAgents] = useState<Agent[]>([])
  const [pec, setPec] = useState<PecConfig>({ host: "", port: "465", user: "", pass: "", from: "" })
  const [showPecPass, setShowPecPass] = useState(false)
  const [showAddAgent, setShowAddAgent] = useState(false)
  const [newAgent, setNewAgent] = useState({ matricola: "", name: "", password: "", isUfficiale: false })
  const [feedback, setFeedback] = useState("")

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/settings")
      if (res.ok) {
        const data = await res.json()
        setSettings({ 
          minUfficiali: data.settings.minUfficiali, 
          usaProporzionale: data.settings.usaProporzionale,
          meseCorrente: data.settings.meseCorrente,
          annoCorrente: data.settings.annoCorrente
        })
        setAgents(data.agents)
        setPec(data.pecConfig)
      }
    } catch { /* */ }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const showFeedback = (msg: string) => {
    setFeedback(msg)
    setTimeout(() => setFeedback(""), 3000)
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      await fetch("/api/admin/settings", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateSettings", ...settings })
      })
      showFeedback("✅ Impostazioni algoritmo salvate")
    } catch { showFeedback("❌ Errore") }
    setSaving(false)
  }



  const savePec = async () => {
    setSaving(true)
    try {
      await fetch("/api/admin/settings", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "savePec", ...pec })
      })
      showFeedback("✅ Credenziali PEC salvate")
    } catch { showFeedback("❌ Errore") }
    setSaving(false)
  }

  const tabs = [
    { key: "algorithm" as const, label: "Algoritmo", icon: Settings, emoji: "⚙️" },
    { key: "pec" as const, label: "Email / PEC", icon: Mail, emoji: "📧" },
  ]

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}
        style={{ animation: 'fadeInUp 0.3s ease-out' }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 backdrop-blur-sm rounded-2xl">
                <Settings size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight">Pannello di Controllo</h2>
                <p className="text-white/50 text-xs font-semibold mt-0.5">Impostazioni · Algoritmo · Agenti · PEC</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Feedback Banner */}
        {feedback && (
          <div className="bg-slate-900 text-white text-sm font-bold text-center py-2 px-4 animate-pulse">
            {feedback}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50 px-4">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-bold transition-all border-b-2 -mb-px ${
                activeTab === tab.key
                  ? "border-blue-600 text-blue-700 bg-white rounded-t-xl"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              <span>{tab.emoji}</span> {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              {/* TAB: ALGORITHM */}
              {activeTab === "algorithm" && (
                <div className="space-y-6 max-w-xl">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 mb-1">⚙️ Parametri Algoritmo</h3>
                    <p className="text-xs text-slate-400">Configura come vengono distribuite le reperibilità</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100">
                      <p className="text-sm font-bold text-amber-900 mb-1">Mese Corrente</p>
                      <p className="text-[10px] text-amber-600 mb-3">Seleziona il mese attivo nell&apos;app</p>
                      <select 
                        value={settings.meseCorrente} 
                        onChange={e => setSettings(s => ({ ...s, meseCorrente: parseInt(e.target.value) }))}
                        className="bg-white border-2 border-amber-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-amber-400 w-full"
                      >
                        {["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"].map((m, i) => (
                          <option key={i} value={i + 1}>{m}</option>
                        ))}
                      </select>
                    </div>

                    <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100">
                      <p className="text-sm font-bold text-amber-900 mb-1">Anno</p>
                      <p className="text-[10px] text-amber-600 mb-3">Anno di riferimento</p>
                      <select 
                        value={settings.annoCorrente} 
                        onChange={e => setSettings(s => ({ ...s, annoCorrente: parseInt(e.target.value) }))}
                        className="bg-white border-2 border-amber-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-amber-400 w-full"
                      >
                        {[2025, 2026, 2027].map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                      <label className="flex items-center justify-between cursor-pointer">
                        <div>
                          <p className="text-sm font-bold text-slate-800">Proporzionalità Assenze</p>
                          <p className="text-xs text-slate-400 mt-0.5">Riduce il target REP per chi ha più assenze nel mese</p>
                        </div>
                        <div className={`w-12 h-7 rounded-full transition-colors relative ${settings.usaProporzionale ? 'bg-blue-600' : 'bg-slate-300'}`}
                          onClick={() => setSettings(s => ({ ...s, usaProporzionale: !s.usaProporzionale }))}
                        >
                          <div className={`w-5 h-5 bg-white rounded-full shadow-md absolute top-1 transition-all ${settings.usaProporzionale ? 'left-6' : 'left-1'}`}></div>
                        </div>
                      </label>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                      <p className="text-sm font-bold text-slate-800 mb-1">Min. Ufficiali per Giorno</p>
                      <p className="text-xs text-slate-400 mb-3">Numero minimo di ufficiali reperibili ogni giorno</p>
                      <select 
                        value={settings.minUfficiali} 
                        onChange={e => setSettings(s => ({ ...s, minUfficiali: parseInt(e.target.value) }))}
                        className="bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-400 w-24"
                      >
                        {[0, 1, 2, 3].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>

                    <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100">
                      <div className="flex items-start gap-3">
                        <AlertCircle size={18} className="text-blue-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold text-blue-800">Parametri Fissi (nel codice)</p>
                          <div className="mt-2 text-xs text-blue-700 space-y-1">
                            <p>• REP base Agente: <strong>5</strong> | REP base Ufficiale: <strong>6</strong></p>
                            <p>• Min reperibili/giorno: <strong>7</strong> | Max: <strong>8</strong></p>
                            <p>• Festivi target/agente: <strong>2</strong> (1 Sab + 1 Dom)</p>
                            <p>• Distanziamento minimo: <strong>2 giorni</strong></p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button onClick={saveSettings} disabled={saving}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl px-6 py-3 font-black text-sm transition-all flex items-center gap-2 shadow-lg shadow-blue-200"
                  >
                    <Save size={16} /> {saving ? 'Salvataggio...' : 'Salva Impostazioni'}
                  </button>
                </div>
              )}



              {/* TAB: PEC */}
              {activeTab === "pec" && (
                <div className="space-y-6 max-w-xl">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 mb-1">📧 Credenziali Email / PEC</h3>
                    <p className="text-xs text-slate-400">Configura il server SMTP per l&apos;invio delle notifiche PEC ai destinatari</p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-0.5">Server SMTP</label>
                      <input type="text" placeholder="Es: smtp.pec.aruba.it" value={pec.host}
                        onChange={e => setPec(p => ({ ...p, host: e.target.value }))}
                        className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-400"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-0.5">Porta</label>
                        <input type="text" placeholder="465" value={pec.port}
                          onChange={e => setPec(p => ({ ...p, port: e.target.value }))}
                          className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-400"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-0.5">Indirizzo Mittente</label>
                        <input type="email" placeholder="nome@pec.it" value={pec.from}
                          onChange={e => setPec(p => ({ ...p, from: e.target.value }))}
                          className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-0.5">Username / Email Account</label>
                      <input type="email" placeholder="account@pec.it" value={pec.user}
                        onChange={e => setPec(p => ({ ...p, user: e.target.value }))}
                        className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-0.5">Password</label>
                      <div className="relative">
                        <input 
                          type={showPecPass ? "text" : "password"} 
                          placeholder="••••••••" 
                          value={pec.pass}
                          onChange={e => setPec(p => ({ ...p, pass: e.target.value }))}
                          className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 pr-12 text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-400"
                        />
                        <button type="button" onClick={() => setShowPecPass(!showPecPass)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showPecPass ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200">
                      <div className="flex items-start gap-3">
                        <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                        <div className="text-xs text-amber-700">
                          <p className="font-bold">Nota sulla sicurezza</p>
                          <p className="mt-0.5">Le credenziali vengono salvate in modo sicuro nel Database di produzione (Supabase). Non sono visibili agli agenti.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button onClick={savePec} disabled={saving}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl px-6 py-3 font-black text-sm transition-all flex items-center gap-2 shadow-lg shadow-blue-200"
                  >
                    <Save size={16} /> {saving ? 'Salvataggio...' : 'Salva Credenziali PEC'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
