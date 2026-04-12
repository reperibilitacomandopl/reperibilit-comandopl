"use client"

import { useState, useEffect } from "react"
import { Building2, Users, Calendar, Plus, Power, PowerOff, RefreshCw, Shield, X, Globe, Zap, Settings } from "lucide-react"
import toast from "react-hot-toast"
import Link from "next/link"

type TenantData = {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  address: string | null
  partitaIva: string | null
  maxAgents: number
  planType: string
  trialEndsAt: string | null
  isActive: boolean
  createdAt: string
  _count: { users: number; shifts: number; vehicles: number }
}

export default function SuperAdminDashboard({ tenants, currentUser }: { tenants: TenantData[], currentUser: { id: string, name: string } }) {
  const [showNewTenant, setShowNewTenant] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isSeeding, setIsSeeding] = useState<string | null>(null)
  const [isToggling, setIsToggling] = useState<string | null>(null)
  const [editingTenant, setEditingTenant] = useState<TenantData | null>(null)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  
  // Form state
  const [formName, setFormName] = useState("")
  const [formSlug, setFormSlug] = useState("")
  const [formAddress, setFormAddress] = useState("")
  const [formPiva, setFormPiva] = useState("")
  const [formPlan, setFormPlan] = useState("TRIAL")
  const [formMaxAgents, setFormMaxAgents] = useState(50)
  const [formAdminName, setFormAdminName] = useState("")
  const [formAdminMatricola, setFormAdminMatricola] = useState("")
  const [formAdminPassword, setFormAdminPassword] = useState("")

  const totalUsers = tenants.reduce((a, t) => a + t._count.users, 0)
  const totalShifts = tenants.reduce((a, t) => a + t._count.shifts, 0)
  const activeTenants = tenants.filter(t => t.isActive).length

  const openEditModal = (t: TenantData) => {
    setEditingTenant(t)
    setFormName(t.name)
    setFormSlug(t.slug)
    setFormAddress(t.address || "")
    setFormPiva(t.partitaIva || "")
    setFormPlan(t.planType)
    setFormMaxAgents(t.maxAgents)
  }

  const handleUpdateTenant = async () => {
    if (!editingTenant) return
    setIsUpdating(true)
    try {
      const res = await fetch("/api/superadmin/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: editingTenant.id,
          name: formName,
          planType: formPlan,
          maxAgents: formMaxAgents,
          address: formAddress,
          partitaIva: formPiva
        })
      })
      if (!res.ok) throw new Error("Errore")
      toast.success("✅ Comando aggiornato!")
      setEditingTenant(null)
      window.location.reload()
    } catch {
      toast.error("Errore aggiornamento")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleSeedTenant = async (tenantId: string, tenantName: string) => {
    if (!confirm(`⚠️ ATTENZIONE: Questa operazione eliminerà tutti i dati esistenti per "${tenantName}" (eccetto l'admin principale) e genererà dati demo istituzionali. Vuoi procedere?`)) return
    
    setIsSeeding(tenantId)
    try {
      const res = await fetch("/api/superadmin/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId })
      })
      if (!res.ok) throw new Error("Errore seeding")
      toast.success(`🏁 Demo generata per ${tenantName}!`)
      window.location.reload()
    } catch {
      toast.error("Errore durante il seeding")
    } finally {
      setIsSeeding(null)
    }
  }

  const handleImpersonate = async (tenantId: string) => {
    try {
      const res = await fetch("/api/superadmin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId })
      })
      const targetTenant = tenants.find(t => t.id === tenantId)
      if (!res.ok) throw new Error("Errore")
      toast.success("🚀 Accesso in corso...")
      setTimeout(() => {
        window.location.href = `/${targetTenant?.slug || 'admin'}/admin/pannello`
      }, 500)
    } catch {
      toast.error("Errore durante l'accesso")
    }
  }

  const handleCreateTenant = async () => {
    if (!formName || !formSlug || !formAdminName || !formAdminMatricola || !formAdminPassword) {
      toast.error("Compila tutti i campi obbligatori")
      return
    }
    setIsCreating(true)
    try {
      const res = await fetch("/api/superadmin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          slug: formSlug.toLowerCase().replace(/[^a-z0-9-]/g, ''),
          address: formAddress,
          partitaIva: formPiva,
          planType: formPlan,
          maxAgents: formMaxAgents,
          adminName: formAdminName,
          adminMatricola: formAdminMatricola,
          adminPassword: formAdminPassword
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Errore")
      toast.success(`✅ Tenant "${formName}" creato con successo!`)
      setShowNewTenant(false)
      setFormName(""); setFormSlug(""); setFormAddress(""); setFormPiva("")
      setFormAdminName(""); setFormAdminMatricola(""); setFormAdminPassword("")
      window.location.reload()
    } catch (err: unknown) {
      if (err instanceof Error) toast.error(err.message)
      else toast.error("Errore sconosciuto")
    } finally {
      setIsCreating(false)
    }
  }

  const handleToggleTenant = async (tenantId: string, currentActive: boolean) => {
    setIsToggling(tenantId)
    try {
      const res = await fetch("/api/superadmin/tenants", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, isActive: !currentActive })
      })
      if (!res.ok) throw new Error("Errore")
      toast.success(currentActive ? "Tenant disattivato" : "Tenant riattivato")
      window.location.reload()
    } catch {
      toast.error("Errore")
    } finally {
      setIsToggling(null)
    }
  }

  const PLAN_COLORS: Record<string, string> = {
    TRIAL: "bg-amber-100 text-amber-700",
    BASIC: "bg-blue-100 text-blue-700",
    PRO: "bg-emerald-100 text-emerald-700",
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Shield size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-black uppercase tracking-widest">Super Admin</h1>
              <p className="text-[10px] text-indigo-300/60 font-bold">Portale Comando SaaS · Pannello Proprietario</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-medium">{currentUser.name}</span>
            <Link href="/" className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg font-bold transition-all">
              ← Torna al Pannello
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-indigo-500/20 rounded-xl"><Building2 size={20} className="text-indigo-400" /></div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Comandi</span>
            </div>
            <p className="text-3xl font-black">{tenants.length}</p>
            <p className="text-[10px] text-emerald-400 font-bold mt-1">{activeTenants} attivi</p>
          </div>
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-blue-500/20 rounded-xl"><Users size={20} className="text-blue-400" /></div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Utenti Tot.</span>
            </div>
            <p className="text-3xl font-black">{totalUsers}</p>
          </div>
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-purple-500/20 rounded-xl"><Calendar size={20} className="text-purple-400" /></div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Turni Tot.</span>
            </div>
            <p className="text-3xl font-black">{totalShifts.toLocaleString()}</p>
          </div>
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-emerald-500/20 rounded-xl"><Zap size={20} className="text-emerald-400" /></div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Stato</span>
            </div>
            <p className="text-lg font-black text-emerald-400">Operativo</p>
            <p className="text-[10px] text-slate-500 font-bold mt-1">v2.0 SaaS</p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black uppercase tracking-tight">Gestione Comandi</h2>
          <button 
            onClick={() => setShowNewTenant(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-5 py-2.5 rounded-xl font-black text-sm shadow-lg shadow-indigo-500/30 transition-all hover:scale-[1.03] active:scale-[0.97]"
          >
            <Plus size={18} />
            Nuovo Comando
          </button>
        </div>

        {/* Tenants Table */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Comando</th>
                  <th className="text-center px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Piano</th>
                  <th className="text-center px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Utenti</th>
                  <th className="text-center px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Turni</th>
                  <th className="text-center px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Veicoli</th>
                  <th className="text-center px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Stato</th>
                  <th className="text-center px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Creato il</th>
                  <th className="text-right px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => (
                  <tr key={tenant.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl flex items-center justify-center text-white font-black text-sm border border-white/10">
                          {tenant.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-white">{tenant.name}</p>
                          <p className="text-[10px] text-slate-500 font-medium">{tenant.slug} · {tenant.address || 'N/A'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-center px-4 py-4">
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase ${PLAN_COLORS[tenant.planType] || 'bg-slate-100 text-slate-600'}`}>
                        {tenant.planType}
                      </span>
                    </td>
                    <td className="text-center px-4 py-4 font-bold text-sm">{tenant._count.users}</td>
                    <td className="text-center px-4 py-4 font-bold text-sm">{tenant._count.shifts.toLocaleString()}</td>
                    <td className="text-center px-4 py-4 font-bold text-sm">{tenant._count.vehicles}</td>
                    <td className="text-center px-4 py-4">
                      {tenant.isActive ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full">
                          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span> ATTIVO
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-red-400 bg-red-400/10 px-2.5 py-1 rounded-full">
                          <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span> SOSPESO
                        </span>
                      )}
                    </td>
                    <td className="text-center px-4 py-4 text-xs text-slate-500 font-medium">
                      {isClient ? 
                        new Date(tenant.createdAt).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' }) 
                        : '...'
                      }
                    </td>
                    <td className="text-right px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleImpersonate(tenant.id)}
                          className="p-2 bg-purple-500/10 text-purple-400 rounded-lg hover:bg-purple-500/20 transition-all"
                          title="Accedi come Admin (Supporto)"
                        >
                          <Globe size={16} />
                        </button>
                        <button
                          disabled={isSeeding === tenant.id}
                          onClick={() => handleSeedTenant(tenant.id, tenant.name)}
                          className="p-2 bg-amber-500/10 text-amber-500 rounded-lg hover:bg-amber-500/20 transition-all disabled:opacity-50"
                          title="Popola con Dati Demo (Seed)"
                        >
                          {isSeeding === tenant.id ? <RefreshCw size={16} className="animate-spin" /> : <Zap size={16} />}
                        </button>
                        <button
                          onClick={() => openEditModal(tenant)}
                          className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg hover:bg-indigo-500/20 transition-all"
                          title="Modifica Dati"
                        >
                          <Settings size={16} />
                        </button>
                        <button
                          disabled={isToggling === tenant.id}
                          onClick={() => handleToggleTenant(tenant.id, tenant.isActive)}
                          className={`p-2 rounded-lg transition-all text-xs font-bold ${
                            tenant.isActive 
                              ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' 
                              : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                          } disabled:opacity-50`}
                          title={tenant.isActive ? "Sospendi" : "Riattiva"}
                        >
                          {isToggling === tenant.id ? <RefreshCw size={16} className="animate-spin" /> : tenant.isActive ? <PowerOff size={16} /> : <Power size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {tenants.length === 0 && (
            <div className="text-center py-16">
              <p className="text-slate-500 font-medium">Nessun comando registrato.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Nuovo Tenant */}
      {showNewTenant && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowNewTenant(false)}></div>
          <div className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-700 p-6 text-white">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/20 rounded-xl"><Building2 size={24} /></div>
                  <div>
                    <h3 className="text-lg font-black">Registra Nuovo Comando</h3>
                    <p className="text-indigo-200 text-xs font-medium mt-0.5">Crea un nuovo ente con il suo amministratore</p>
                  </div>
                </div>
                <button onClick={() => setShowNewTenant(false)} className="text-white/60 hover:text-white"><X size={20} /></button>
              </div>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">📋 Dati Ente</p>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nome Comando *</label>
                  <input value={formName} onChange={e => { setFormName(e.target.value); setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')) }}
                    placeholder="Comando P.L. Matera" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold text-white focus:border-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Slug (URL) *</label>
                  <input value={formSlug} onChange={e => setFormSlug(e.target.value)}
                    placeholder="matera" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold text-white focus:border-indigo-500 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Indirizzo</label>
                  <input value={formAddress} onChange={e => setFormAddress(e.target.value)}
                    placeholder="Matera (MT)" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold text-white focus:border-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">P.IVA</label>
                  <input value={formPiva} onChange={e => setFormPiva(e.target.value)}
                    placeholder="01234567890" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold text-white focus:border-indigo-500 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Piano</label>
                  <select value={formPlan} onChange={e => setFormPlan(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold text-white focus:border-indigo-500 outline-none appearance-none">
                    <option value="TRIAL">TRIAL (14 giorni)</option>
                    <option value="BASIC">BASIC</option>
                    <option value="PRO">PRO</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Max Agenti</label>
                  <input type="number" value={formMaxAgents} onChange={e => setFormMaxAgents(parseInt(e.target.value) || 50)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold text-white focus:border-indigo-500 outline-none" />
                </div>
              </div>

              <div className="border-t border-slate-800 pt-4 mt-4">
                <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-3">👤 Amministratore del Comando</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nome *</label>
                    <input value={formAdminName} onChange={e => setFormAdminName(e.target.value)}
                      placeholder="Dott. Rossi" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold text-white focus:border-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Matricola *</label>
                    <input value={formAdminMatricola} onChange={e => setFormAdminMatricola(e.target.value)}
                      placeholder="MAT001" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold text-white focus:border-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Password *</label>
                    <input type="password" value={formAdminPassword} onChange={e => setFormAdminPassword(e.target.value)}
                      placeholder="••••••" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold text-white focus:border-indigo-500 outline-none" />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-950/50 border-t border-white/5">
              <button 
                disabled={isCreating}
                onClick={handleCreateTenant}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white py-3.5 rounded-xl font-black text-sm shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isCreating ? <RefreshCw size={18} className="animate-spin" /> : <Plus size={18} />}
                {isCreating ? "Creazione in corso..." : "Crea Comando e Amministratore"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Modifica Tenant */}
      {editingTenant && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setEditingTenant(null)}></div>
          <div className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white text-center">
              <h3 className="text-lg font-black uppercase">Modifica Comando</h3>
              <p className="text-blue-200 text-xs font-bold mt-0.5">{editingTenant.name}</p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nome Comando</label>
                <input value={formName} onChange={e => setFormName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold text-white outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Piano</label>
                  <select value={formPlan} onChange={e => setFormPlan(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold text-white outline-none appearance-none">
                    <option value="TRIAL">TRIAL</option>
                    <option value="BASIC">BASIC</option>
                    <option value="PRO">PRO</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Max Agenti</label>
                  <input type="number" value={formMaxAgents} onChange={e => setFormMaxAgents(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold text-white outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Indirizzo</label>
                  <input value={formAddress} onChange={e => setFormAddress(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold text-white outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">P.IVA</label>
                  <input value={formPiva} onChange={e => setFormPiva(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold text-white outline-none" />
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-950/50 flex gap-3 border-t border-white/10">
              <button onClick={() => setEditingTenant(null)} className="flex-1 bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl font-bold text-sm transition-all">Annulla</button>
              <button 
                disabled={isUpdating}
                onClick={handleUpdateTenant}
                className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all"
              >
                {isUpdating ? <RefreshCw size={16} className="animate-spin" /> : null}
                Salva Modifiche
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
