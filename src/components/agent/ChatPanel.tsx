"use client"

import { useState, useEffect, useRef } from "react"
import { Send, X, Users, Loader2 } from "lucide-react"

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
  currentUser: { id: string; name: string }
  patrolGroupId: string
  tenantSlug?: string | null
  onClose?: () => void
}

export default function ChatPanel({ currentUser, patrolGroupId, tenantSlug, onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
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

  useEffect(() => {
    fetchMessages()
    const interval = setInterval(fetchMessages, 5000) // Poll every 5s
    return () => clearInterval(interval)
  }, [patrolGroupId])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

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
            <h3 className="font-black tracking-wider uppercase text-sm">Chat Pattuglia</h3>
            <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest">Comunicazioni Interne</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
            <X size={20} />
          </button>
        )}
      </div>

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
