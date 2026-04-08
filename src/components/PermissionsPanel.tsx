"use client"

import { useState } from "react"
import toast from "react-hot-toast"
import { Shield, Key, Check, X, RefreshCw, UserCheck, Search } from "lucide-react"

interface UserPermission {
  id: string
  name: string
  matricola: string
  role: string
  canManageShifts: boolean
  canManageUsers: boolean
  canVerifyClockIns: boolean
  canConfigureSystem: boolean
}

interface PermissionsPanelProps {
  users: UserPermission[]
}

export default function PermissionsPanel({ users: initialUsers }: PermissionsPanelProps) {
  const [users, setUsers] = useState(initialUsers)
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({})
  const [searchTerm, setSearchTerm] = useState("")

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.matricola.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const togglePermission = async (userId: string, field: keyof UserPermission) => {
    const user = users.find(u => u.id === userId)
    if (!user) return

    setLoadingStates(prev => ({ ...prev, [`${userId}-${field}`]: true }))

    const updatedPermissions = {
      canManageShifts: user.canManageShifts,
      canManageUsers: user.canManageUsers,
      canVerifyClockIns: user.canVerifyClockIns,
      canConfigureSystem: user.canConfigureSystem,
      [field]: !user[field]
    }

    try {
      const res = await fetch("/api/admin/users/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, permissions: updatedPermissions })
      })

      if (!res.ok) throw new Error("Errore aggiornamento")

      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, [field]: !u[field] } : u
      ))
      toast.success("Permesso aggiornato")
    } catch {
      toast.error("Impossibile aggiornare i permessi")
    } finally {
      setLoadingStates(prev => ({ ...prev, [`${userId}-${field}`]: false }))
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-indigo-600 rounded-lg text-white">
                <Shield size={20} />
             </div>
             <h2 className="text-xl font-bold text-slate-900 tracking-tight">Delega Funzioni Operative</h2>
          </div>
          <p className="text-sm text-slate-500 font-medium">Assegna poteri amministrativi specifici al personale del comando.</p>
        </div>

        <div className="relative group w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Cerca per nome o matricola..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:border-indigo-500/30 focus:bg-white transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Permissions Table */}
      <div className="overflow-hidden border border-slate-200 rounded-3xl shadow-sm bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200">
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Operatore</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 text-center">Gestione Turni</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 text-center">Risorse & Squadre</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 text-center">Verifiche GPS</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 text-center">Setup Sistema</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 italic font-medium">
              {filteredUsers.map(user => (
                <tr key={user.id} className="group hover:bg-slate-50/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all font-black text-xs">
                         {user.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                      </div>
                      <div>
                        <div className="text-sm font-black text-slate-800 tracking-tight not-italic">{user.name}</div>
                        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-tight not-italic">Matr. {user.matricola} • <span className={user.role === 'ADMIN' ? 'text-indigo-500' : ''}>{user.role}</span></div>
                      </div>
                    </div>
                  </td>

                  {[
                    { key: 'canManageShifts', label: 'Turnazioni' },
                    { key: 'canManageUsers', label: 'Risorse' },
                    { key: 'canVerifyClockIns', label: 'GPS' },
                    { key: 'canConfigureSystem', label: 'Setup' }
                  ].map((perm) => (
                    <td key={perm.key} className="px-6 py-4 text-center">
                      <button
                        onClick={() => togglePermission(user.id, perm.key as any)}
                        disabled={loadingStates[`${user.id}-${perm.key}`] || (user.role === 'ADMIN')}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 focus:outline-none ${
                          user[perm.key as keyof UserPermission] ? 'bg-indigo-600 shadow-lg shadow-indigo-600/30' : 'bg-slate-200'
                        } ${user.role === 'ADMIN' ? 'opacity-40 cursor-not-allowed' : 'active:scale-90 hover:ring-4 hover:ring-indigo-100'}`}
                      >
                        <span className="sr-only">Toggle {perm.label}</span>
                        {loadingStates[`${user.id}-${perm.key}`] ? (
                          <RefreshCw size={12} className="absolute left-1.5 animate-spin text-white" />
                        ) : (
                          <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-300 ${
                              user[perm.key as keyof UserPermission] ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        )}
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-indigo-50 rounded-3xl p-6 border border-indigo-100 flex gap-5 items-start">
         <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
            <Key size={24} />
         </div>
         <div className="space-y-2">
            <h4 className="text-sm font-black text-indigo-900 tracking-tight uppercase">Informazioni di Sicurezza</h4>
            <p className="text-sm text-indigo-700/70 font-medium leading-relaxed italic">
               Gli utenti con ruolo <span className="font-bold underline">ADMIN</span> possiedono tutti i permessi per impostazione predefinita e non possono essere modificati da questo pannello. 
               La delega dei poteri agli <span className="font-bold underline">AGENTI</span> consente loro di accedere a sezioni riservate senza acquisire privilegi di sistema globali.
            </p>
         </div>
      </div>
    </div>
  )
}
