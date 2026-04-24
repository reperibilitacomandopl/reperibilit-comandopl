"use client"

import { useState, useEffect, useCallback } from "react"
import { Settings, Mail, X, Save, Eye, EyeOff, AlertCircle, Loader2, BarChart3, Hash, Wand2 } from "lucide-react"
import StatisticsDashboard from "./StatisticsDashboard"
import AdminInitialBalances from "./AdminInitialBalances"
import ServicesSettings from "./ServicesSettings"
import RuleEngineTab from "./admin/RuleEngineTab"
import HelpTooltip from "./ui/HelpTooltip"

type Agent = {
  id: string; name: string; matricola: string; isUfficiale: boolean;
  massimale: number; email: string | null; phone: string | null
}

type SettingsData = {
  minUfficiali: number;
  usaProporzionale: boolean;
  meseCorrente: number;
  annoCorrente: number;
  massimaleAgente: number;
  massimaleUfficiale: number;
  distaccoMinimo: number;
  permettiConsecutivi: boolean;
  bpTurnoContinuato: number;
  bpStaccoMinTurno1: number;
  bpStaccoMaxPausa: number;
  bpStaccoMinTurno2: number;
}

export type TabType = "algorithm" | "pec" | "stats" | "balances" | "services" | "rules"


type PecConfig = {
  host: string; port: string; user: string; pass: string; from: string
}

export default function SettingsPanel({ onClose, embedded, initialTab = "algorithm" }: { onClose: () => void; embedded?: boolean, initialTab?: TabType }) {
  const [loading, setLoading] = useState<boolean>(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>(initialTab)
  const [settings, setSettings] = useState<SettingsData>({ 
    minUfficiali: 1, 
    usaProporzionale: true, 
    meseCorrente: 4, 
    annoCorrente: 2026,
    massimaleAgente: 5,
    massimaleUfficiale: 6,
    distaccoMinimo: 2,
    permettiConsecutivi: false,
    bpTurnoContinuato: 7,
    bpStaccoMinTurno1: 6,
    bpStaccoMaxPausa: 2,
    bpStaccoMinTurno2: 2
  })
  const [agents, setAgents] = useState<Agent[]>([])
  const [pec, setPec] = useState<PecConfig>({ host: "", port: "465", user: "", pass: "", from: "" })
  const [showPecPass, setShowPecPass] = useState(false)
  const [feedback, setFeedback] = useState("")

  const fetchData = useCallback(async () => {
    setLoading(prev => prev ? prev : true) // Avoid redundant setState if already loading
    try {
      const res = await fetch("/api/admin/settings")
      if (res.ok) {
        const data = await res.json()
        setSettings({ 
          minUfficiali: data.settings.minUfficiali, 
          usaProporzionale: data.settings.usaProporzionale,
          meseCorrente: data.settings.meseCorrente,
          annoCorrente: data.settings.annoCorrente,
          massimaleAgente: data.settings.massimaleAgente || 5,
          massimaleUfficiale: data.settings.massimaleUfficiale || 6,
          distaccoMinimo: data.settings.distaccoMinimo ?? 2,
          permettiConsecutivi: data.settings.permettiConsecutivi || false,
          bpTurnoContinuato: data.settings.bpTurnoContinuato ?? 7,
          bpStaccoMinTurno1: data.settings.bpStaccoMinTurno1 ?? 6,
          bpStaccoMaxPausa: data.settings.bpStaccoMaxPausa ?? 2,
          bpStaccoMinTurno2: data.settings.bpStaccoMinTurno2 ?? 2
        })
        setAgents(data.agents)
        setPec(data.pecConfig)
      }
    } catch { showFeedback("❌ Errore caricamento impostazioni") }
    setLoading(false)
  }, [])

  useEffect(() => {
    // Silencing the cascading render warning by making the call asynchronous 
    // or by using a check if it's already loading.
    const t = setTimeout(() => fetchData(), 0);
    return () => clearTimeout(t);
  }, [fetchData])

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

  const innerContent = (
      <div className={`bg-white ${embedded ? 'rounded-2xl' : 'rounded-3xl shadow-2xl'} w-full ${embedded ? '' : 'max-w-5xl w-[95vw] max-h-[92vh]'} overflow-hidden flex flex-col`} onClick={e => e.stopPropagation()}
        style={embedded ? undefined : { animation: 'fadeInUp 0.3s ease-out' }}
      >
        {/* Header Premium */}
        <div className="bg-slate-900 p-8 text-white relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] -mr-48 -mt-48"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-white/10 backdrop-blur-md border border-white/10 rounded-[1.5rem] flex items-center justify-center shadow-2xl">
                <Settings size={28} className="text-blue-400" />
              </div>
              <div>
                <h2 className="text-3xl font-black tracking-tighter uppercase leading-tight">Pannello di Controllo</h2>
                <p className="text-slate-400 text-[10px] font-black tracking-[0.3em] uppercase opacity-70 mt-1">Sentinel Autonomous System Configuration</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 text-white/40 rounded-2xl transition-all border border-white/5 active:scale-95"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Feedback Banner */}
        {feedback && (
          <div className="bg-blue-600 text-white text-[10px] font-black uppercase tracking-[0.2em] text-center py-2.5 px-4 animate-in slide-in-from-top duration-300">
            {feedback}
          </div>
        )}

        {/* Tabs Modernized */}
        <div className="flex border-b border-slate-100 bg-white px-8 py-5 shrink-0 overflow-x-auto no-scrollbar">
          <div className="flex gap-2 bg-slate-50 p-1.5 rounded-[1.2rem] border border-slate-100">
            {[
              { id: "algorithm", label: "Algoritmo", icon: Settings },
              { id: "rules", label: "Motore Regole", icon: Wand2 },
              { id: "pec", label: "Email / PEC", icon: Mail },
              { id: "services", label: "Servizi", icon: Settings },
              { id: "stats", label: "Analisi Dati", icon: BarChart3 },
              { id: "balances", label: "Saldi", icon: Hash }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2.5 px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                  activeTab === tab.id 
                    ? "bg-white text-blue-600 shadow-md shadow-blue-900/10 border border-slate-100" 
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-100/50"
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
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
                <div className="space-y-10 max-w-4xl animate-in fade-in slide-in-from-bottom-5 duration-500">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
                    <div className="flex items-center gap-4">
                       <div className="w-1.5 h-8 bg-blue-600 rounded-full"></div>
                       <div>
                          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Parametri Temporali</h3>
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Configurazione ciclo operativo mensile</p>
                       </div>
                    </div>
                    
                    <div className="flex items-center gap-3 bg-white p-2 rounded-[1.5rem] border border-slate-200 shadow-sm">
                        <select 
                          value={settings.meseCorrente} 
                          onChange={e => setSettings(s => ({ ...s, meseCorrente: parseInt(e.target.value) }))}
                          className="bg-slate-50 border border-slate-100 rounded-xl px-5 py-2.5 text-xs font-black text-slate-700 focus:outline-none focus:border-blue-500 transition-all uppercase appearance-none cursor-pointer"
                        >
                          {["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"].map((m, i) => (
                            <option key={i} value={i + 1}>{m}</option>
                          ))}
                        </select>
                        <select 
                          value={settings.annoCorrente} 
                          onChange={e => setSettings(s => ({ ...s, annoCorrente: parseInt(e.target.value) }))}
                          className="bg-slate-50 border border-slate-100 rounded-xl px-5 py-2.5 text-xs font-black text-slate-700 focus:outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer"
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
                          <p className="text-sm font-bold text-slate-800">Proporzionalità Assenze <HelpTooltip text="Se attivo, l'algoritmo riduce il numero di turni di reperibilità assegnati agli agenti che hanno più assenze (ferie, malattia) nel mese, distribuendo in modo più equo." title="Proporzionalità" /></p>
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
                      <p className="text-sm font-bold text-slate-800 mb-1">Min. Ufficiali per Giorno <HelpTooltip text="Imposta il numero minimo di ufficiali che devono essere reperibili ogni giorno. L'algoritmo garantirà sempre questa soglia." title="Soglia Ufficiali" /></p>
                      <p className="text-xs text-slate-400 mb-3">Numero minimo di ufficiali reperibili ogni giorno</p>
                      <select 
                        value={settings.minUfficiali} 
                        onChange={e => setSettings(s => ({ ...s, minUfficiali: parseInt(e.target.value) }))}
                        className="bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-400 w-24"
                      >
                        {[0, 1, 2, 3].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100">
                        <p className="text-sm font-bold text-blue-900 mb-1">Max Agente</p>
                        <p className="text-[10px] text-blue-600 mb-3">Turni max mensili per agente</p>
                        <select 
                          value={settings.massimaleAgente} 
                          onChange={e => setSettings(s => ({ ...s, massimaleAgente: parseInt(e.target.value) }))}
                          className="bg-white border-2 border-blue-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-400 w-full"
                        >
                          {[3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n} Turni</option>)}
                        </select>
                      </div>
                      <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100">
                        <p className="text-sm font-bold text-blue-900 mb-1">Max Ufficiale</p>
                        <p className="text-[10px] text-blue-600 mb-3">Turni max mensili per ufficiale</p>
                        <select 
                          value={settings.massimaleUfficiale} 
                          onChange={e => setSettings(s => ({ ...s, massimaleUfficiale: parseInt(e.target.value) }))}
                          className="bg-white border-2 border-blue-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-400 w-full"
                        >
                          {[4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n} Turni</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="bg-indigo-50 rounded-2xl p-5 border border-indigo-100">
                      <p className="text-sm font-bold text-indigo-900 mb-1">Distanza Minima tra Turni <HelpTooltip text="Giorni di riposo obbligatorio tra due turni di reperibilità consecutivi. Se la copertura non è possibile con 2 giorni, il sistema scenderà automaticamente a 1 o 0." title="Distacco" /></p>
                      <p className="text-xs text-indigo-600 mb-4">Garantisce il riposo tra due reperibilità consecutive</p>
                      <div className="flex items-center gap-4">
                        {[0, 1, 2].map(days => (
                          <button
                            key={days}
                            onClick={() => setSettings(s => ({ ...s, distaccoMinimo: days }))}
                            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all border-2 ${
                              settings.distaccoMinimo === days
                                ? "bg-indigo-600 border-indigo-600 text-white shadow-md"
                                : "bg-white border-indigo-100 text-indigo-400 hover:border-indigo-300"
                            }`}
                          >
                            {days === 0 ? "Consecutivi" : days === 1 ? "1 Giorno" : "2 Giorni"}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                      <label className="flex items-center justify-between cursor-pointer">
                        <div>
                          <p className="text-sm font-bold text-slate-800">Permetti Turni Consecutivi</p>
                          <p className="text-xs text-slate-400 mt-0.5">Permette di avere REP in giorni seguiti (distanza 0)</p>
                        </div>
                        <div className={`w-12 h-7 rounded-full transition-colors relative ${settings.permettiConsecutivi ? 'bg-indigo-600' : 'bg-slate-300'}`}
                          onClick={() => setSettings(s => ({ ...s, permettiConsecutivi: !s.permettiConsecutivi }))}
                        >
                          <div className={`w-5 h-5 bg-white rounded-full shadow-md absolute top-1 transition-all ${settings.permettiConsecutivi ? 'left-6' : 'left-1'}`}></div>
                        </div>
                      </label>
                    </div>

                    {/* ─── BUONI PASTO ─── */}
                    <div className="pt-6 border-t border-slate-200">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-1.5 h-8 bg-emerald-600 rounded-full"></div>
                        <div>
                          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Regole Buoni Pasto</h3>
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Parametri personalizzabili per ogni Comando</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100">
                          <p className="text-sm font-bold text-emerald-900 mb-1">Soglia Turno Continuato</p>
                          <p className="text-[10px] text-emerald-600 mb-3">Ore minime senza pausa per maturare il ticket</p>
                          <input type="number" step="0.5" min="4" max="12"
                            value={settings.bpTurnoContinuato}
                            onChange={e => setSettings(s => ({ ...s, bpTurnoContinuato: parseFloat(e.target.value) }))}
                            className="w-full bg-white border-2 border-emerald-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-emerald-400"
                          />
                        </div>
                        <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100">
                          <p className="text-sm font-bold text-emerald-900 mb-1">Min. Ore Turno 1</p>
                          <p className="text-[10px] text-emerald-600 mb-3">Blocco mattina prima della pausa pranzo</p>
                          <input type="number" step="0.5" min="2" max="10"
                            value={settings.bpStaccoMinTurno1}
                            onChange={e => setSettings(s => ({ ...s, bpStaccoMinTurno1: parseFloat(e.target.value) }))}
                            className="w-full bg-white border-2 border-emerald-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-emerald-400"
                          />
                        </div>
                        <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100">
                          <p className="text-sm font-bold text-emerald-900 mb-1">Pausa Max Consentita</p>
                          <p className="text-[10px] text-emerald-600 mb-3">Tempo massimo di stacco tra i due blocchi</p>
                          <input type="number" step="0.5" min="0.5" max="4"
                            value={settings.bpStaccoMaxPausa}
                            onChange={e => setSettings(s => ({ ...s, bpStaccoMaxPausa: parseFloat(e.target.value) }))}
                            className="w-full bg-white border-2 border-emerald-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-emerald-400"
                          />
                        </div>
                        <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100">
                          <p className="text-sm font-bold text-emerald-900 mb-1">Min. Ore Rientro</p>
                          <p className="text-[10px] text-emerald-600 mb-3">Blocco pomeridiano minimo dopo la pausa</p>
                          <input type="number" step="0.5" min="1" max="6"
                            value={settings.bpStaccoMinTurno2}
                            onChange={e => setSettings(s => ({ ...s, bpStaccoMinTurno2: parseFloat(e.target.value) }))}
                            className="w-full bg-white border-2 border-emerald-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-emerald-400"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100">
                      <div className="flex items-start gap-3">
                        <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold text-amber-800">Informazioni Algoritmo</p>
                          <p className="mt-2 text-xs text-amber-700 leading-relaxed">
                            L&apos;algoritmo cercherà di coprire ogni giorno con almeno <strong>{settings.minUfficiali} ufficiale</strong> e un totale di <strong>7-8 persone</strong>.<br/><br/>
                            Se la copertura non è possibile con il distanziamento di 2 giorni, il sistema proverà automaticamente a scendere a <strong>1 giorno</strong> (o <strong>0</strong> se attivato) pur di non lasciare buchi nel calendario.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: PEC */}
              {activeTab === "pec" && (
                <div className="space-y-6 max-w-xl animate-in fade-in duration-500">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 mb-1">📧 Credenziali Email / PEC</h3>
                    <p className="text-xs text-slate-400">Configura il server SMTP per l&apos;invio delle notifiche PEC</p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-0.5">Server SMTP</label>
                      <input type="text" placeholder="Es: smtp.pec.aruba.it" value={pec.host}
                        onChange={e => setPec(p => ({ ...p, host: e.target.value }))}
                        className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-400"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-0.5">Porta</label>
                        <input type="text" placeholder="465" value={pec.port}
                          onChange={e => setPec(p => ({ ...p, port: e.target.value }))}
                          className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-400"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-0.5">Indirizzo Mittente</label>
                        <input type="email" placeholder="nome@pec.it" value={pec.from}
                          onChange={e => setPec(p => ({ ...p, from: e.target.value }))}
                          className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-0.5">Username / Email Account</label>
                      <input type="email" placeholder="account@pec.it" value={pec.user}
                        onChange={e => setPec(p => ({ ...p, user: e.target.value }))}
                        className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-400"
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
                          className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 pr-12 text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-400"
                        />
                        <button type="button" onClick={() => setShowPecPass(!showPecPass)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showPecPass ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100 flex items-start gap-3">
                    <AlertCircle size={16} className="text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-blue-700 leading-relaxed font-medium">
                      Nota: Le credenziali sono salvate in modo sicuro e criptato nel database.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB: STATS */}
              {activeTab === "stats" && (
                <StatisticsDashboard month={settings.meseCorrente} year={settings.annoCorrente} />
              )}

              {/* TAB: BALANCES */}
              {activeTab === "balances" && (
                <AdminInitialBalances allAgents={agents} currentYear={settings.annoCorrente} />
              )}

              {/* TAB: SERVICES */}
              {activeTab === "services" && (
                <ServicesSettings />
              )}

              {/* TAB: RULES ENGINE */}
              {activeTab === "rules" && (
                <RuleEngineTab />
              )}
            </>
          )}
        </div>

        {/* Footer Polish */}
        {activeTab !== "balances" && (
          <div className="px-10 py-6 bg-slate-50 border-t border-slate-100 flex justify-end items-center gap-4 shrink-0">
            {activeTab !== "stats" ? (
              <>
                <button onClick={fetchData} className="px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-200 transition-colors">
                  Reset Valori
                </button>
                <button
                  onClick={activeTab === "pec" ? savePec : saveSettings}
                  disabled={saving}
                  className="flex items-center gap-3 bg-slate-900 hover:bg-blue-600 disabled:opacity-50 text-white px-10 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-200 transition-all active:scale-95"
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  Aggiorna Sentinel
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3 text-[10px] text-slate-400 font-black uppercase tracking-widest bg-white border border-slate-100 px-6 py-3 rounded-full shadow-sm">
                <BarChart3 size={16} className="text-blue-500" />
                Dati sincronizzati in tempo reale dal cloud
              </div>
            )}
          </div>
        )}
      </div>
  )

  if (embedded) {
    return innerContent
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={onClose}>
      {innerContent}
    </div>
  )
}
