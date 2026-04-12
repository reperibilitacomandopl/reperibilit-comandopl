"use client"

import { useState, useEffect } from "react"
import { Building2, Users, RotateCcw, Briefcase, Rocket, ChevronRight, ChevronLeft, Check, Loader2, Upload, Save, X } from "lucide-react"
import toast from "react-hot-toast"
import AgentImporter from "./AgentImporter"

// ============================================================================
// ONBOARDING WIZARD — Prima configurazione Comando
// ============================================================================

interface OnboardingWizardProps {
  tenantSlug: string
  tenantName: string
  onComplete: () => void
}

const STEPS = [
  { icon: Building2, label: "Il tuo Comando", color: "blue" },
  { icon: Users, label: "Organico", color: "emerald" },
  { icon: RotateCcw, label: "Cicli Turno", color: "orange" },
  { icon: Briefcase, label: "Servizi", color: "purple" },
  { icon: Rocket, label: "Lancio!", color: "indigo" },
]

export default function OnboardingWizard({ tenantSlug, tenantName, onComplete }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [saving, setSaving] = useState(false)
  
  // Step 1: Dati Comando
  const [commandName, setCommandName] = useState(tenantName || "")
  const [commandAddress, setCommandAddress] = useState("")
  const [commandLogo, setCommandLogo] = useState("")
  
  // Step 2: Agenti (gestito da AgentImporter)
  const [agentsImported, setAgentsImported] = useState(0)
  
  // Step 3: Gruppi Rotazione
  const [quickPatternA, setQuickPatternA] = useState("MMMMMPPRRRRRPPPPPMM RRRRRR")
  const [quickPatternName, setQuickPatternName] = useState("Squadra A")
  const [groupsCreated, setGroupsCreated] = useState(0)
  
  // Step 4: Servizi
  const [defaultCategories, setDefaultCategories] = useState([
    { name: "Vigilanza Urbana", types: ["Pattuglia Zona Nord", "Pattuglia Zona Sud", "Pattuglia Centro"] },
    { name: "Viabilità", types: ["Viabilità Scuole", "Viabilità Mercato", "Rilievo Incidente"] },
    { name: "Edilizia", types: ["Sopralluogo", "Notifica Atti"] },
    { name: "Commercio", types: ["Controllo Esercizi", "Mercato Settimanale"] },
  ])
  const [servicesCreated, setServicesCreated] = useState(false)

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) setCurrentStep(currentStep + 1)
  }
  const prevStep = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1)
  }

  const saveCommandData = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/tenant", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: commandName, 
          address: commandAddress,
          logoUrl: commandLogo 
        })
      })
      if (res.ok) {
        toast.success("Dati Comando salvati!")
        nextStep()
      } else {
        toast.error("Errore nel salvataggio")
      }
    } catch {
      toast.error("Errore di rete")
    }
    setSaving(false)
  }

  const createQuickGroup = async () => {
    setSaving(true)
    try {
      // Convert user-friendly pattern to JSON array
      const patternArr = quickPatternA.trim().split("").filter(c => c !== " ").map(c => {
        if (c === "M" || c === "m") return "M"
        if (c === "P" || c === "p") return "P"
        if (c === "R" || c === "r") return "R"
        return c.toUpperCase()
      })
      
      const res = await fetch("/api/admin/rotation-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: quickPatternName,
          pattern: JSON.stringify(patternArr),
          mStartTime: "07:00",
          mEndTime: "13:00",
          pStartTime: "13:00",
          pEndTime: "19:00",
        })
      })
      if (res.ok) {
        setGroupsCreated(g => g + 1)
        toast.success(`Gruppo "${quickPatternName}" creato!`)
        // Reset for another group
        setQuickPatternName(`Squadra ${String.fromCharCode(65 + groupsCreated + 1)}`)
      } else {
        const data = await res.json()
        toast.error(data.error || "Errore nella creazione del gruppo")
      }
    } catch {
      toast.error("Errore di rete")
    }
    setSaving(false)
  }

  const createDefaultServices = async () => {
    setSaving(true)
    try {
      for (const cat of defaultCategories) {
        const catRes = await fetch("/api/admin/services", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: cat.name })
        })
        if (catRes.ok) {
          const catData = await catRes.json()
          for (const typeName of cat.types) {
            await fetch("/api/admin/services", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: typeName, categoryId: catData.id })
            })
          }
        }
      }
      setServicesCreated(true)
      toast.success("Categorie servizio create!")
    } catch {
      toast.error("Errore nella creazione dei servizi")
    }
    setSaving(false)
  }

  const removeCategoryPreview = (idx: number) => {
    setDefaultCategories(prev => prev.filter((_, i) => i !== idx))
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/70 backdrop-blur-xl p-4">
      <div className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-up">
        
        {/* Header con Progress */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-900 p-6 shrink-0">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">Setup Iniziale</h2>
              <p className="text-xs text-white/50 font-medium mt-0.5">Configura il tuo Comando in pochi minuti</p>
            </div>
            <button onClick={onComplete} className="p-2 text-white/30 hover:text-white/60 transition-colors" title="Salta (puoi configurare dopo)">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Step Indicators */}
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-center flex-1">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-xs font-bold ${
                  i === currentStep
                    ? "bg-white/15 text-white" 
                    : i < currentStep 
                      ? "text-emerald-400" 
                      : "text-white/20"
                }`}>
                  {i < currentStep ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <s.icon className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 rounded-full ${i < currentStep ? "bg-emerald-400/50" : "bg-white/10"}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          
          {/* STEP 0: Dati Comando */}
          {currentStep === 0 && (
            <div className="max-w-md mx-auto">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Building2 className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-2xl font-black text-slate-900">Benvenuto su Sentinel!</h3>
                <p className="text-sm text-slate-500 mt-2 font-medium">Iniziamo configurando i dati del tuo Comando</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Nome Comando *</label>
                  <input
                    type="text" value={commandName}
                    onChange={(e) => setCommandName(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-semibold focus:border-blue-500 focus:outline-none transition-colors"
                    placeholder="Polizia Locale di Comune XYZ"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Indirizzo Sede</label>
                  <input
                    type="text" value={commandAddress}
                    onChange={(e) => setCommandAddress(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-semibold focus:border-blue-500 focus:outline-none transition-colors"
                    placeholder="Via Roma 1, 70022 Altamura (BA)"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">URL Logo (opzionale)</label>
                  <input
                    type="url" value={commandLogo}
                    onChange={(e) => setCommandLogo(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-semibold focus:border-blue-500 focus:outline-none transition-colors"
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 1: Import Agenti */}
          {currentStep === 1 && (
            <div>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-2xl font-black text-slate-900">Carica il Personale</h3>
                <p className="text-sm text-slate-500 mt-2 font-medium">
                  Importa l&apos;elenco agenti da un file Excel o CSV
                  {agentsImported > 0 && <span className="text-emerald-600 font-bold"> · {agentsImported} importati ✓</span>}
                </p>
              </div>
              <AgentImporter 
                embedded={true} 
                onImportComplete={(count) => setAgentsImported(prev => prev + count)} 
              />
            </div>
          )}

          {/* STEP 2: Cicli Turno */}
          {currentStep === 2 && (
            <div className="max-w-md mx-auto">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <RotateCcw className="w-8 h-8 text-orange-600" />
                </div>
                <h3 className="text-2xl font-black text-slate-900">Cicli di Turno</h3>
                <p className="text-sm text-slate-500 mt-2 font-medium">
                  Crea un pattern di rotazione per le tue squadre
                  {groupsCreated > 0 && <span className="text-emerald-600 font-bold"> · {groupsCreated} gruppi creati ✓</span>}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Nome Gruppo</label>
                  <input
                    type="text" value={quickPatternName}
                    onChange={(e) => setQuickPatternName(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-semibold focus:border-orange-500 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Pattern (M=Mattina P=Pomeriggio R=Riposo)</label>
                  <input
                    type="text" value={quickPatternA}
                    onChange={(e) => setQuickPatternA(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-mono font-semibold focus:border-orange-500 focus:outline-none transition-colors tracking-wider"
                    placeholder="MMMMMPPRRRRRRPPPPP..."
                  />
                  <p className="text-[10px] text-slate-400 mt-1.5 font-medium">
                    Pattern tipo: 5M 2P 7R 5P 2M 7R = ciclo 28 giorni standard
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Mattina</label>
                    <div className="flex gap-2">
                      <input defaultValue="07:00" className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-orange-400" />
                      <input defaultValue="13:00" className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-orange-400" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Pomeriggio</label>
                    <div className="flex gap-2">
                      <input defaultValue="13:00" className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-orange-400" />
                      <input defaultValue="19:00" className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-orange-400" />
                    </div>
                  </div>
                </div>

                <button
                  onClick={createQuickGroup}
                  disabled={saving || !quickPatternName.trim()}
                  className="w-full py-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-lg shadow-orange-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                  Crea Gruppo di Rotazione
                </button>
              </div>

              <p className="text-center text-xs text-slate-400 mt-6 font-medium">
                Puoi creare altri gruppi e modificarli dalla sezione <strong>Risorse → Motori Ciclici</strong>.
              </p>
            </div>
          )}

          {/* STEP 3: Servizi */}
          {currentStep === 3 && (
            <div className="max-w-lg mx-auto">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Briefcase className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-2xl font-black text-slate-900">Categorie Servizio</h3>
                <p className="text-sm text-slate-500 mt-2 font-medium">
                  Ti proponiamo le categorie standard. Puoi personalizzarle dopo.
                  {servicesCreated && <span className="text-emerald-600 font-bold"> · Configurazione salvata ✓</span>}
                </p>
              </div>

              <div className="space-y-3 mb-6">
                {defaultCategories.map((cat, i) => (
                  <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-4 group">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-slate-800">{cat.name}</span>
                      <button onClick={() => removeCategoryPreview(i)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition-all">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {cat.types.map((t, j) => (
                        <span key={j} className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-500 uppercase tracking-wide">{t}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {!servicesCreated ? (
                <button
                  onClick={createDefaultServices}
                  disabled={saving || defaultCategories.length === 0}
                  className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-lg shadow-purple-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Crea {defaultCategories.length} Categorie
                </button>
              ) : (
                <div className="text-center py-4 text-emerald-600 font-bold text-sm flex items-center justify-center gap-2">
                  <Check className="w-5 h-5" /> Categorie create con successo!
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Lancio */}
          {currentStep === 4 && (
            <div className="max-w-md mx-auto text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-200">
                <Rocket className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-3xl font-black text-slate-900 mb-3">Tutto Pronto!</h3>
              <p className="text-base text-slate-500 font-medium mb-8 leading-relaxed">
                Il tuo Comando è configurato. Ora puoi generare i turni, creare l&apos;OdS giornaliero e gestire il tuo personale dalla dashboard.
              </p>

              {/* Summary */}
              <div className="grid grid-cols-3 gap-4 mb-10">
                <div className="bg-slate-50 rounded-2xl p-4">
                  <div className="text-2xl font-black text-indigo-600">{agentsImported || "0"}</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Agenti</div>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4">
                  <div className="text-2xl font-black text-orange-600">{groupsCreated}</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Gruppi Turno</div>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4">
                  <div className="text-2xl font-black text-purple-600">{servicesCreated ? defaultCategories.length : 0}</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Categorie</div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-left mb-8">
                <p className="text-xs font-bold text-blue-800 mb-2">💡 Prossimi passi suggeriti:</p>
                <ul className="space-y-1.5 text-xs text-blue-700 font-medium">
                  <li>• Vai su <strong>Pianificazione</strong> → Auto-Compila per generare i turni del mese</li>
                  <li>• Assegna ogni agente al suo gruppo di rotazione da <strong>Risorse → Anagrafica</strong></li>
                  <li>• Configura le <strong>Pattuglie Fisse</strong> per l&apos;OdS automatico</li>
                  <li>• Invia il primo turno su <strong>Telegram</strong> ai tuoi agenti</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="border-t border-slate-100 p-6 flex items-center justify-between shrink-0 bg-slate-50/50">
          <div>
            {currentStep > 0 ? (
              <button onClick={prevStep} className="flex items-center gap-2 px-5 py-2.5 text-slate-500 hover:text-slate-800 font-bold text-sm transition-colors">
                <ChevronLeft className="w-4 h-4" /> Indietro
              </button>
            ) : (
              <button onClick={onComplete} className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors">
                Salta configurazione →
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-medium">
              {currentStep + 1} di {STEPS.length}
            </span>
            {currentStep === 0 ? (
              <button
                onClick={saveCommandData}
                disabled={saving || !commandName.trim()}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-md transition-all active:scale-95 flex items-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Salva e Continua</>}
              </button>
            ) : currentStep === STEPS.length - 1 ? (
              <button
                onClick={onComplete}
                className="px-8 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center gap-2"
              >
                <Rocket className="w-4 h-4" /> Vai alla Dashboard
              </button>
            ) : (
              <button
                onClick={nextStep}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm shadow-md transition-all active:scale-95 flex items-center gap-2"
              >
                Continua <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
