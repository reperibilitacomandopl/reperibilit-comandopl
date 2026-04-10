"use client"

import { useState, useEffect, useRef } from "react"
import { Bell, Check, Info, AlertTriangle, CheckCircle, Clock, X, Map, BellRing, Settings2 } from "lucide-react"
import toast from "react-hot-toast"

type NotificationType = "REQUEST" | "SUCCESS" | "ALERT" | "INFO"

interface Notification {
  id: string
  title: string
  message: string
  type: NotificationType
  link?: string
  isRead: boolean
  createdAt: string
  metadata?: any // Per dati aggiuntivi come coordinate o ID scambi
}

export default function NotificationHub({ userRole }: { userRole?: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [lastNotificationId, setLastNotificationId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications")
      const data = await res.json()
      if (data.success) {
        setNotifications(data.notifications)
        setUnreadCount(data.unreadCount)

        // Se c'è una nuova notifica di tipo ALERT, suona l'allarme
        const newest = data.notifications[0]
        if (newest && newest.id !== lastNotificationId && newest.type === "ALERT" && !newest.isRead) {
          playAlertSound()
        }
        if (newest) setLastNotificationId(newest.id)
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error)
    }
  }

  const playAlertSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(e => console.warn("Audio play blocked by browser:", e))
    }
  }

  const markAsRead = async (id?: string) => {
    try {
      const body = id ? { notificationId: id } : { markAllAsRead: true }
      const res = await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      })
      if (res.ok) fetchNotifications()
    } catch (error) {
       /* */
    }
  }

  const handleAction = async (notificationId: string, action: "ACCEPT" | "REJECT", metadataRaw: any) => {
    const toastId = toast.loading("Elaborazione in corso...")
    try {
      // Parsing dei metadati se sono in formato stringa
      let metadata = metadataRaw
      if (typeof metadataRaw === 'string') {
        try {
          metadata = JSON.parse(metadataRaw)
        } catch (e) {
          console.error("Failed to parse metadata", e)
        }
      }

      // 1. GESTIONE SCAMBI TURNO
      if (metadata?.swapId) {
        const res = await fetch(`/api/shifts/swap/${metadata.swapId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: action === "ACCEPT" ? "ACCEPTED" : "REJECTED" })
        })
        if (res.ok) {
          toast.success("Scambio processato!", { id: toastId })
          markAsRead(notificationId)
        } else {
          const errData = await res.json()
          toast.error(errData.error || "Errore durante lo scambio.", { id: toastId })
        }
      } 
      // 2. GESTIONE RICHIESTE GENERICHE (FERIE/PERMESSI)
      else if (metadata?.requestId) {
        const res = await fetch(`/api/admin/requests/${metadata.requestId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: action === "ACCEPT" ? "APPROVED" : "REJECTED" })
        })
        if (res.ok) {
          toast.success("Richiesta aggiornata!", { id: toastId })
          markAsRead(notificationId)
        } else {
          const errData = await res.json()
          toast.error(errData.error || "Errore durante l'aggiornamento.", { id: toastId })
        }
      } else {
        toast.error("Metadati mancanti o non validi per l'azione.", { id: toastId })
      }
    } catch (err) {
      toast.error("Errore di rete.", { id: toastId })
    }
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000) // Poll more frequently for Sentinel
    return () => clearInterval(interval)
  }, [lastNotificationId])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return "Proprio ora"
    if (diffMins < 60) return `${diffMins} min fa`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} ore fa`
    return `${Math.floor(diffMins / 1440)} giorni fa`
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* Audio Element for SOS Alerts */}
      <audio ref={audioRef} src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" preload="auto" />

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2.5 rounded-2xl transition-all duration-300 group ${isOpen ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
      >
        <Bell size={22} className={`${unreadCount > 0 ? "animate-swing" : ""}`} />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 w-5 h-5 bg-rose-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-[3px] border-slate-900 shadow-xl ring-2 ring-rose-500/20">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed sm:absolute right-4 sm:right-0 left-4 sm:left-auto mt-4 w-auto sm:w-[26rem] bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[60] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
          
          <div className="p-6 border-b border-white/5 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/30 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] mb-0.5">Sentinel Hub</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                {unreadCount} Messaggi non letti
              </p>
            </div>
            <div className="flex items-center gap-2">
               <button onClick={() => markAsRead()} className="p-2 hover:bg-white/5 rounded-xl text-slate-400 transition-colors" title="Segna tutte come lette">
                  <Check size={18} />
               </button>
               <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/5 rounded-xl text-slate-400 transition-colors sm:hidden">
                  <X size={18} />
               </button>
            </div>
          </div>

          <div className="max-h-[32rem] overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4 px-10 text-center">
                <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center">
                   <BellRing size={24} className="text-slate-600" />
                </div>
                <p className="text-slate-500 text-xs font-black uppercase tracking-widest leading-loose">
                  Il tuo centro operativo è vuoto.<br/>Nessuna allerta al momento.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-6 transition-all relative group/item overflow-hidden ${!n.isRead ? 'bg-indigo-500/5' : 'hover:bg-white/5'}`}
                  >
                    {!n.isRead && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 shadow-[2px_0_10px_rgba(99,102,241,0.5)]" />
                    )}
                    
                    <div className="flex gap-4">
                      <div className={`mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${
                        n.type === 'ALERT' ? 'bg-rose-500/20 text-rose-500 px-3' : 
                        n.type === 'REQUEST' ? 'bg-amber-500/20 text-amber-500 px-3' :
                        n.type === 'SUCCESS' ? 'bg-emerald-500/20 text-emerald-500 px-3' :
                        'bg-blue-500/20 text-blue-500 px-3'
                      }`}>
                         {n.type === 'ALERT' ? <AlertTriangle size={20} className="animate-pulse" /> : 
                          n.type === 'REQUEST' ? <Clock size={20} /> :
                          n.type === 'SUCCESS' ? <CheckCircle size={20} /> :
                          <Info size={20} />}
                      </div>

                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                           <h4 className="text-xs font-black text-white leading-tight">{n.title}</h4>
                           <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter whitespace-nowrap">
                             {getTimeAgo(n.createdAt)}
                           </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                          {n.message}
                        </p>

                        {/* Actions Contextual */}
                        <div className="flex items-center gap-2 mt-4">
                          {n.type === 'REQUEST' && (
                            <>
                              <button 
                                onClick={() => handleAction(n.id, "ACCEPT", n.metadata)}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                              >
                                APPROVA
                              </button>
                              <button 
                                onClick={() => handleAction(n.id, "REJECT", n.metadata)}
                                className="bg-slate-800 hover:bg-rose-600/20 hover:text-rose-500 text-slate-400 px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                              >
                                RIFIUTA
                              </button>
                            </>
                          )}
                          {n.type === 'ALERT' && n.link && (
                             <a 
                               href={n.link}
                               className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5"
                             >
                               <Map size={12} /> VEDI MAPPA
                             </a>
                          )}
                          {n.link && n.type !== 'ALERT' && (
                            <button 
                              onClick={() => {
                                if(!n.isRead) markAsRead(n.id)
                                window.location.href = n.link || '#'
                              }}
                              className="text-[10px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-[0.2em]"
                            >
                              Vedi Dettagli
                            </button>
                          )}
                          <button 
                            onClick={() => markAsRead(n.id)}
                            className="text-[9px] font-bold text-slate-600 hover:text-slate-400 ml-auto"
                          >
                             {n.isRead ? 'ARCHIVIATA' : 'SEGNA COME LETTA'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 bg-white/5 border-t border-white/5">
             <button className="w-full flex items-center justify-center gap-2 text-slate-500 hover:text-white transition-all">
                <Settings2 size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Impostazioni Sentinel</span>
             </button>
          </div>
        </div>
      )}
    </div>
  )
}
