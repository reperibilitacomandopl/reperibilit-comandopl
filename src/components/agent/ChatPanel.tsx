"use client"

import { useState, useEffect, useRef } from "react"
import { Send, X, Users, Loader2, Plus, Search, UserPlus } from "lucide-react"
import toast from "react-hot-toast"

interface Message {
  id: string
  message: string
  createdAt: string
  sender: {
    id: string
    name: string
  }
}

interface ChatPanelProps {
  currentUser: { id: string; name: string; isUfficiale?: boolean }
  patrolGroupId: string
  tenantSlug?: string | null
  onClose?: () => void
  type?: "PATROL" | "SECTION"
}

export default function ChatPanel({ currentUser, patrolGroupId, tenantSlug, onClose, type = "PATROL" }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const [members, setMembers] = useState<any[]>([])
  const [showAddMember, setShowAddMember] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [allAgents, setAllAgents] = useState<any[]>([])
  const [addingMember, setAddingMember] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/agent/chat?patrolGroupId=${patrolGroupId}`)
      const data = await res.json()
      if (res.ok) {
        setMessages(data.messages)
      }
    } catch (err) {
      console.error("Errore caricamento chat:", err)
    } finally {
      setLoading(false)
    }
  }

  const fetchMembers = async () => {
    try {
      const res = await fetch(`/api/agent/chat/members?patrolGroupId=${patrolGroupId}`)
      const data = await res.json()
      if (res.ok) {
        setMembers(data.members)
      }
    } catch (err) {
      console.error("Errore caricamento membri:", err)
    }
  }

  const fetchAllAgents = async () => {
    try {
      const res = await fetch('/api/admin/users')
      const data = await res.json()
      if (res.ok) {
        setAllAgents(data.users)
      }
    } catch (err) {
      console.error("Errore caricamento agenti:", err)
    }
  }

  useEffect(() => {
    fetchMessages()
    fetchMembers()
    const interval = setInterval(() => {
      fetchMessages()
      fetchMembers()
    }, 5000)
    return () => clearInterval(interval)
  }, [patrolGroupId])

  useEffect(() => {
    if (showAddMember && allAgents.length === 0) {
      fetchAllAgents()
    }
  }, [showAddMember])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleAddMember = async (userId: string) => {
    setAddingMember(true)
    try {
      const res = await fetch('/api/agent/chat/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patrolGroupId, userId })
      })
      if (res.ok) {
        toast.success("Membro aggiunto alla chat")
        fetchMembers()
        setShowAddMember(false)
      } else {
        const d = await res.json()
        toast.error(d.error || "Errore")
      }
    } catch {
      toast.error("Errore di rete")
    } finally {
      setAddingMember(false)
    }
  }

  const filteredAgents = allAgents.filter(a => 
    a.id !== currentUser.id && 
    !members.some(m => m.id === a.id) &&
    (a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
     a.matricola.includes(searchQuery))
  )

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || sending) return

    setSending(true)
    const tempId = Date.now().toString()
    const tempMsg: Message = {
      id: tempId,
      message: newMessage.trim(),
      createdAt: new Date().toISOString(),
      sender: { id: currentUser.id, name: currentUser.name }
    }
    
    setMessages(prev => [...prev, tempMsg])
    setNewMessage("")

    try {
      await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patrolGroupId,
          message: tempMsg.message
        })
      })
      // Non c'è bisogno di ricaricare subito, il polling lo farà
    } catch (err) {
      console.error("Errore invio messaggio", err)
      // Remove temp message if failed
      setMessages(prev => prev.filter(m => m.id !== tempId))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col h-[500px] w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200">
      <div className="bg-indigo-600 p-4 flex items-center justify-between text-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-xl">
            <Users size={20} />
          </div>
          <div>
            <h3 className="font-black tracking-wider uppercase text-sm">
              {type === "SECTION" ? "Chat Sezione" : "Chat Pattuglia"}
            </h3>
            <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest">
              {type === "SECTION" ? "Comunicazioni Reparto" : "Comunicazioni Interne"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowMembers(!showMembers)} 
            className={`p-2 rounded-xl transition-all ${showMembers ? 'bg-white text-indigo-600' : 'hover:bg-white/20 text-white'}`}
            title="Membri"
          >
            <Users size={20} />
          </button>
          {onClose && (
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {showMembers && (
        <div className="bg-white border-b border-slate-200 animate-in slide-in-from-top duration-300 overflow-hidden">
          <div className="p-4 bg-slate-50 flex items-center justify-between">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Partecipanti ({members.length})</h4>
            {currentUser.isUfficiale && (
              <button 
                onClick={() => setShowAddMember(true)}
                className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 font-black text-[9px] uppercase tracking-widest"
              >
                <Plus size={14} /> Aggiungi
              </button>
            )}
          </div>
          <div className="max-h-[150px] overflow-y-auto p-2">
            <div className="grid grid-cols-1 gap-1">
              {members.map(m => (
                <div key={m.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${m.isUfficiale ? 'bg-indigo-500' : 'bg-emerald-500'}`}></div>
                    <span className="text-xs font-bold text-slate-700">{m.name}</span>
                  </div>
                  <span className="text-[9px] font-black text-slate-400 uppercase">{m.qualifica || 'Agente'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showAddMember && (
        <div className="absolute inset-0 z-50 bg-white flex flex-col animate-in fade-in duration-200">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-black uppercase text-sm text-slate-800">Aggiungi alla Chat</h3>
            <button onClick={() => setShowAddMember(false)} className="p-2 hover:bg-slate-100 rounded-xl"><X size={20} /></button>
          </div>
          <div className="p-4 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Cerca agente..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {filteredAgents.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs font-bold uppercase">Nessun agente trovato</div>
            ) : (
              filteredAgents.map(a => (
                <button 
                  key={a.id} 
                  disabled={addingMember}
                  onClick={() => handleAddMember(a.id)}
                  className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-indigo-50 transition-colors group"
                >
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-black text-slate-800">{a.name}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Matr. {a.matricola} • {a.qualifica}</span>
                  </div>
                  <UserPlus className="text-slate-300 group-hover:text-indigo-600" size={18} />
                </button>
              ))
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50" ref={scrollRef}>
        {loading && messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400">
            <Loader2 className="animate-spin" size={24} />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
            <Users size={32} className="opacity-50" />
            <p className="text-sm font-bold">Nessun messaggio.</p>
            <p className="text-xs text-center">Inizia la conversazione con la tua pattuglia.</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.sender.id === currentUser.id
            const showName = !isMe && (i === 0 || messages[i - 1].sender.id !== msg.sender.id)
            
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                {showName && <span className="text-[10px] font-black text-slate-400 ml-1 mb-1">{msg.sender.name}</span>}
                <div className={`px-4 py-2 rounded-2xl max-w-[85%] text-sm shadow-sm ${
                  isMe ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
                }`}>
                  {msg.message}
                </div>
                <span className="text-[9px] text-slate-400 mt-1 font-bold">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )
          })
        )}
      </div>

      <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-100 flex items-center gap-2 shrink-0">
        <input 
          type="text" 
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Scrivi un messaggio..." 
          className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
        />
        <button 
          type="submit" 
          disabled={!newMessage.trim() || sending}
          className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {sending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
        </button>
      </form>
    </div>
  )
}
