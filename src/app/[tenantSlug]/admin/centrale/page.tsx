"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { useSession } from "next-auth/react"
import { Shield, Plus, Navigation, AlertTriangle, CheckCircle2, Clock, Pencil, X } from "lucide-react"
import toast from "react-hot-toast"
import { StreetSearchAutocomplete } from "@/components/StreetSearchAutocomplete"

// Carica la mappa lato client
const LiveMap = dynamic(() => import("@/components/admin/LiveMap"), { ssr: false, loading: () => <div className="w-full h-full flex items-center justify-center bg-gray-100">Caricamento Mappa...</div> })

export default function CentraleOperativa() {
  const { data: session } = useSession()
  const [patrols, setPatrols] = useState<any[]>([])
  const [interventions, setInterventions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewModal, setShowNewModal] = useState(false)
  const [editingIntervention, setEditingIntervention] = useState<any>(null)
  
  // Dati per nuovo intervento
  const [newType, setNewType] = useState("INCIDENTE")
  const [newPriority, setNewPriority] = useState("YELLOW")
  const [newAddress, setNewAddress] = useState("")
  const [newDesc, setNewDesc] = useState("")

  // Dati per modifica intervento
  const [editType, setEditType] = useState("")
  const [editPriority, setEditPriority] = useState("")
  const [editAddress, setEditAddress] = useState("")
  const [editDesc, setEditDesc] = useState("")

  const fetchData = async () => {
    try {
      const res = await fetch("/api/admin/live-map")
      if (res.ok) {
        const data = await res.json()
        setPatrols(data.patrols)
        setInterventions(data.interventions)
      }
    } catch (error) {
      console.error("Fetch live map error", error)
    } finally {
      setLoading(false)
    }
  }

  // Polling ogni 15 secondi
  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 15000)
    return () => clearInterval(interval)
  }, [])

  const handleCreateIntervention = async (e: React.FormEvent) => {
    e.preventDefault()
    // Mock lat/lng based on a central point, in a real app use Geocoding API
    const lat = 40.8286 + (Math.random() - 0.5) * 0.02
    const lng = 16.5518 + (Math.random() - 0.5) * 0.02

    try {
      const res = await fetch("/api/admin/interventions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: newType,
          priority: newPriority,
          address: newAddress,
          description: newDesc,
          lat, lng
        })
      })
      if (res.ok) {
        toast.success("Intervento creato")
        setShowNewModal(false)
        fetchData()
      } else {
        toast.error("Errore creazione intervento")
      }
    } catch (error) {
      toast.error("Errore di rete")
    }
  }

  const handleAssign = async (interventionId: string, assignedToId: string) => {
    try {
      const res = await fetch("/api/admin/interventions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: interventionId, assignedToId })
      })
      if (res.ok) {
        toast.success("Pattuglia assegnata")
        fetchData()
      } else {
        toast.error("Errore durante l'assegnazione")
      }
    } catch (error) {
      toast.error("Errore di rete")
    }
  }

  const openEdit = (intervention: any) => {
    setEditingIntervention(intervention)
    setEditType(intervention.type)
    setEditPriority(intervention.priority)
    setEditAddress(intervention.address || "")
    setEditDesc(intervention.description || "")
  }

  const handleUpdateIntervention = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch("/api/admin/interventions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingIntervention.id,
          type: editType,
          priority: editPriority,
          address: editAddress,
          description: editDesc
        })
      })
      if (res.ok) {
        toast.success("Intervento aggiornato")
        setEditingIntervention(null)
        fetchData()
      } else {
        toast.error("Errore aggiornamento")
      }
    } catch (error) {
      toast.error("Errore di rete")
    }
  }

  const handleCloseIntervention = async (id: string) => {
    try {
      const res = await fetch("/api/admin/interventions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: 'COMPLETED' })
      })
      if (res.ok) {
        toast.success("Intervento chiuso")
        setEditingIntervention(null)
        fetchData()
      }
    } catch (error) {
      toast.error("Errore di rete")
    }
  }

  const handleReopenIntervention = async (id: string) => {
    try {
      const res = await fetch("/api/admin/interventions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: 'PENDING' })
      })
      if (res.ok) {
        toast.success("Intervento riaperto")
        setEditingIntervention(null)
        fetchData()
      }
    } catch (error) {
      toast.error("Errore di rete")
    }
  }

  if (!session) return null

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-white overflow-hidden">
      
      {/* Sidebar Interventi */}
      <div className="w-80 border-r flex flex-col bg-gray-50 z-10 shadow-lg relative">
        <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
            <h2 className="font-semibold">Centrale Operativa</h2>
          </div>
          <button onClick={() => setShowNewModal(true)} className="p-1 hover:bg-slate-800 rounded">
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Interventi Attivi ({interventions.length})</h3>
          
          {interventions.length === 0 && (
             <div className="text-center text-gray-500 py-8 text-sm">Nessun intervento in corso.</div>
          )}

          {interventions.map(i => (
            <div key={i.id} className={`p-3 bg-white rounded-lg border-l-4 shadow-sm text-sm cursor-pointer hover:shadow-md transition-shadow ${i.priority === 'RED' ? 'border-red-500' : i.priority === 'YELLOW' ? 'border-yellow-500' : 'border-green-500'}`}>
              <div className="flex justify-between items-start mb-1">
                <span className="font-semibold">{i.type}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(i)} className="p-1 hover:bg-gray-100 rounded" title="Modifica">
                    <Pencil className="w-3 h-3 text-gray-400" />
                  </button>
                  <span className="text-[10px] text-gray-400"><Clock className="w-3 h-3 inline mr-1"/>{new Date(i.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
              </div>
              <p className="text-gray-600 text-xs mb-2 truncate" title={i.address}>{i.address}</p>
              
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                  i.status === 'PENDING' ? 'bg-gray-100 text-gray-600' :
                  i.status === 'DISPATCHED' ? 'bg-blue-100 text-blue-700' :
                  i.status === 'ACCEPTED' ? 'bg-purple-100 text-purple-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {i.status}
                </span>

                {i.assignedTo ? (
                  <span className="text-[10px] text-gray-600 font-medium">Assegnato: {i.assignedTo.name}</span>
                ) : (
                  <span className="text-[10px] text-red-500 font-medium animate-pulse">In attesa di invio</span>
                )}
              </div>
            </div>
          ))}

          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 mt-6">Pattuglie in Servizio ({patrols.length})</h3>
          {patrols.map(p => (
            <div key={p.userId} className="p-2 bg-white rounded border border-blue-100 shadow-sm text-xs flex justify-between items-center">
              <div>
                <p className="font-medium text-slate-800">{p.name}</p>
                <p className="text-[10px] text-gray-500">{p.vehicle || 'Nessun veicolo'}</p>
              </div>
              <div className="w-2 h-2 rounded-full bg-green-500" title="GPS Attivo"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Mappa */}
      <div className="flex-1 relative bg-gray-200">
        {!loading && (
           <LiveMap patrols={patrols} interventions={interventions} onAssign={handleAssign} />
        )}
      </div>

      {/* Modale Nuovo Intervento */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-visible">
            <div className="p-4 border-b bg-slate-50 flex justify-between items-center rounded-t-xl">
              <h2 className="font-semibold text-slate-800">Nuovo Intervento</h2>
              <button onClick={() => setShowNewModal(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <form onSubmit={handleCreateIntervention} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Tipologia</label>
                  <select value={newType} onChange={e => setNewType(e.target.value)} className="w-full border rounded-md p-2 text-sm">
                    <option value="INCIDENTE">Incidente Stradale</option>
                    <option value="VIABILITA">Viabilità</option>
                    <option value="LITE">Lite in corso</option>
                    <option value="CONTROLLO">Controllo Territorio</option>
                    <option value="ALTRO">Altro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Priorità</label>
                  <select value={newPriority} onChange={e => setNewPriority(e.target.value)} className="w-full border rounded-md p-2 text-sm">
                    <option value="RED">🔴 Codice Rosso (Emergenza)</option>
                    <option value="YELLOW">🟡 Codice Giallo (Urgente)</option>
                    <option value="GREEN">🟢 Codice Verde (Differibile)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Indirizzo / Luogo</label>
                <StreetSearchAutocomplete
                  value={newAddress}
                  onChange={(val) => setNewAddress(val)}
                  placeholder="Es. Via Bari 12, Altamura"
                  className="w-full !border-gray-200 !bg-white !text-gray-900 focus:!ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Descrizione Dettagliata</label>
                <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} className="w-full border rounded-md p-2 text-sm" rows={3} placeholder="Note aggiuntive..."></textarea>
              </div>
              <div className="pt-4 border-t flex justify-end gap-2">
                <button type="button" onClick={() => setShowNewModal(false)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200">Annulla</button>
                <button type="submit" className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 shadow-sm">Crea Intervento</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale Modifica Intervento */}
      {editingIntervention && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-visible">
            <div className="p-4 border-b bg-slate-50 flex justify-between items-center rounded-t-xl">
              <h2 className="font-semibold text-slate-800">Modifica Intervento</h2>
              <button onClick={() => setEditingIntervention(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateIntervention} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Tipologia</label>
                  <select value={editType} onChange={e => setEditType(e.target.value)} className="w-full border rounded-md p-2 text-sm">
                    <option value="INCIDENTE">Incidente Stradale</option>
                    <option value="VIABILITA">Viabilità</option>
                    <option value="LITE">Lite in corso</option>
                    <option value="CONTROLLO">Controllo Territorio</option>
                    <option value="ALTRO">Altro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Priorità</label>
                  <select value={editPriority} onChange={e => setEditPriority(e.target.value)} className="w-full border rounded-md p-2 text-sm">
                    <option value="RED">🔴 Codice Rosso (Emergenza)</option>
                    <option value="YELLOW">🟡 Codice Giallo (Urgente)</option>
                    <option value="GREEN">🟢 Codice Verde (Differibile)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Indirizzo / Luogo</label>
                <StreetSearchAutocomplete
                  value={editAddress}
                  onChange={(val) => setEditAddress(val)}
                  placeholder="Es. Via Bari 12, Altamura"
                  className="w-full !border-gray-200 !bg-white !text-gray-900 focus:!ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Descrizione Dettagliata</label>
                <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} className="w-full border rounded-md p-2 text-sm" rows={3} placeholder="Note aggiuntive..."></textarea>
              </div>
              <div className="pt-4 border-t flex justify-between">
                <div className="flex gap-2">
                  {editingIntervention.status !== 'COMPLETED' ? (
                    <button type="button" onClick={() => handleCloseIntervention(editingIntervention.id)} className="px-4 py-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700 shadow-sm">Chiudi Intervento</button>
                  ) : (
                    <button type="button" onClick={() => handleReopenIntervention(editingIntervention.id)} className="px-4 py-2 text-sm text-white bg-orange-600 rounded-md hover:bg-orange-700 shadow-sm">Riapri Intervento</button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setEditingIntervention(null)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200">Annulla</button>
                  <button type="submit" className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 shadow-sm">Salva Modifiche</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
