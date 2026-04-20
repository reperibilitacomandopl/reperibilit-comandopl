"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Bell, Info, AlertTriangle, Clock, X, BellRing, RefreshCw, User, Calendar, ChevronRight, CheckCircle } from "lucide-react"
import { getLabel } from "@/utils/agenda-codes"
import toast from "react-hot-toast"

type NotificationType = "REQUEST" | "SUCCESS" | "ALERT" | "INFO"

interface Notification {
  id: string
  title: string
  message: string
  type: NotificationType
  link?: string
  isRead: boolean
  isArchived: boolean
  createdAt: string
  metadata?: Record<string, unknown> // Per dati aggiuntivi come coordinate o ID scambi
}

interface NotificationHubProps {
  userRole?: string
}

export default function NotificationHub({ userRole }: NotificationHubProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [lastNotificationId, setLastNotificationId] = useState<string | null>(null)
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)
  const [detailData, setDetailData] = useState<any>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'UNREAD' | 'READ' | 'ARCHIVED'>('UNREAD')
  const menuRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const fetchNotifications = useCallback(async () => {
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
    } catch {
       /* */
    }
  }, [lastNotificationId])

  const playAlertSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioContext) return
      
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gainNode = ctx.createGain()
      
      // Crea un suono tipo "sirena bit" per l'allarme
      osc.type = 'square'
      osc.frequency.setValueAtTime(800, ctx.currentTime) // Tono altissimo
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.8) // Scende
      
      // Volume e decadenza
      gainNode.gain.setValueAtTime(1, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1)
      
      osc.connect(gainNode)
      gainNode.connect(ctx.destination)
      
      osc.start()
      osc.stop(ctx.currentTime + 1)
    } catch (e) {
      console.warn("Autoplay audio bloccato. Interazione necessaria.", e)
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
    } catch {
       /* */
    }
  }

  const handleArchive = async (id?: string) => {
    try {
      const body = id ? { archiveId: id } : { archiveAll: true }
      const res = await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      })
      if (res.ok) {
        fetchNotifications()
        if (id && selectedNotification?.id === id) setSelectedNotification(null)
      }
    } catch {
       /* */
    }
  }

  // Ascolto Messaggi dal Service Worker per Notifiche Push in Background
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "PLAY_ALARM" && event.data.isSos) {
        playAlertSound()
        fetchNotifications() // Ricarica le notifiche visto che c'è un'emergenza
      }
    }
    navigator.serviceWorker.addEventListener("message", handleSWMessage)
    return () => navigator.serviceWorker.removeEventListener("message", handleSWMessage)
  }, [fetchNotifications])

  const handleAction = async (notificationId: string, action: "ACCEPT" | "REJECT", metadataRaw: any) => {
    const toastId = toast.loading("Elaborazione in corso...")
    try {
      let metadata: any = metadataRaw
      if (typeof metadataRaw === 'string') {
        try {
          metadata = JSON.parse(metadataRaw)
        } catch (e) {
          console.error("Failed to parse metadata", e)
        }
      }

      if (metadata?.swapId) {
        const res = await fetch(`/api/shifts/swap/${metadata.swapId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: action === "ACCEPT" ? "ACCEPTED" : "REJECTED" })
        })
        if (res.ok) {
          toast.success("Scambio processato!", { id: toastId })
          markAsRead(notificationId)
          // Ricarica i dettagli per mostrare il timbro
          const currentNotification = notifications.find(n => n.id === notificationId)
          if (currentNotification) openDetails(currentNotification)
        } else {
          const errData = await res.json()
          toast.error(errData.error || "Errore durante lo scambio.", { id: toastId })
        }
      } 
      else if (metadata?.requestId) {
        const res = await fetch(`/api/admin/requests/${metadata.requestId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: action === "ACCEPT" ? "APPROVED" : "REJECTED" })
        })
        if (res.ok) {
          toast.success("Richiesta aggiornata!", { id: toastId })
          markAsRead(notificationId)
          const currentNotification = notifications.find(n => n.id === notificationId)
          if (currentNotification) openDetails(currentNotification)
        } else {
          const errData = await res.json()
          toast.error(errData.error || "Errore durante l'aggiornamento.", { id: toastId })
        }
      } else {
        toast.error("Metadati mancanti o non validi per l'azione.", { id: toastId })
      }
    } catch {
      toast.error("Errore di rete.", { id: toastId })
    }
  }

  const openDetails = async (notification: Notification) => {
    setSelectedNotification(notification)
    setDetailData(null)
    setDetailLoading(true)

    try {
      let metadata = notification.metadata
      if (typeof metadata === 'string') metadata = JSON.parse(metadata)

      if (metadata?.swapId) {
        const res = await fetch(`/api/shifts/swap/${metadata.swapId}`)
        const data = await res.json()
        if (data.success) setDetailData({ type: 'SWAP', ...data.swap })
      } else if (metadata?.requestId) {
        const res = await fetch(`/api/admin/absence-requests/${metadata.requestId}`)
        const data = await res.json()
        if (data.success) setDetailData({ type: 'REQUEST', ...data.request })
      } else if (metadata?.alertId) {
        setDetailData({ type: 'ALERT', ...metadata })
      }
    } catch (err) {
      console.error("Failed to fetch notification details", err)
    } finally {
      setDetailLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000) // Poll more frequently for Sentinel
    return () => clearInterval(interval)
  }, [fetchNotifications])

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

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'UNREAD') return !n.isRead && !n.isArchived
    if (activeTab === 'READ') return n.isRead && !n.isArchived
    return n.isArchived
  })

  // Componente Timbro Digitale
  const DigitalStamp = ({ status }: { status?: string }) => {
    if (!status || status === 'PENDING') return null
    
    const isApproved = status === 'ACCEPTED' || status === 'APPROVED' || status === 'COMPLETED'
    const text = isApproved ? 'APPROVATO' : 'RIFIUTATO'
    const color = isApproved ? 'border-emerald-500 text-emerald-500' : 'border-rose-500 text-rose-500'

    return (
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 border-8 ${color} px-8 py-4 rounded-xl font-black text-4xl opacity-30 select-none pointer-events-none z-50 mix-blend-overlay tracking-[0.2em] pointer-events-none`}>
        {text}
      </div>
    )
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* Audio Element for SOS Alerts */}
      <audio ref={audioRef} src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" preload="auto" />

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2.5 rounded-2xl transition-all duration-300 group ${isOpen ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
      >
        <Bell width={22} height={22} className={`${unreadCount > 0 ? "animate-swing" : ""}`} />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 w-5 h-5 bg-rose-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-[3px] border-slate-900 shadow-xl ring-2 ring-rose-500/20">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed sm:absolute right-4 sm:right-0 left-4 sm:left-auto mt-4 w-auto sm:w-[28rem] bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[60] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
          
          <div className="p-6 border-b border-white/5 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/30">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] mb-0.5">Sentinel Hub</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Centro Operativo Notifiche</p>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/5 rounded-xl text-slate-400 transition-colors sm:hidden">
                <X width={18} height={18} />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex p-1 bg-black/40 rounded-2xl border border-white/5">
               <button 
                 onClick={() => setActiveTab('UNREAD')}
                 className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'UNREAD' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:text-slate-300'}`}
               >
                 Da Leggere ({notifications.filter(n => !n.isRead && !n.isArchived).length})
               </button>
               <button 
                 onClick={() => setActiveTab('READ')}
                 className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'READ' ? 'bg-indigo-600/40 text-white' : 'text-slate-500 hover:text-slate-300'}`}
               >
                 Lette
               </button>
               <button 
                 onClick={() => setActiveTab('ARCHIVED')}
                 className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'ARCHIVED' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}
               >
                 Archiviate
               </button>
            </div>
          </div>

          <div className="max-h-[32rem] overflow-y-auto custom-scrollbar">
            {filteredNotifications.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4 px-10 text-center">
                <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center">
                   <BellRing width={24} height={24} className="text-slate-600" />
                </div>
                <p className="text-slate-500 text-xs font-black uppercase tracking-widest leading-loose">
                  Nessuna notifica in questa sezione.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {filteredNotifications.map((n) => (
                  <div key={n.id} className={`p-6 transition-all relative group/item overflow-hidden ${!n.isRead ? 'bg-indigo-500/5' : 'hover:bg-white/5'}`}>
                    {!n.isRead && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 shadow-[2px_0_10px_rgba(99,102,241,0.5)]" />}
                    
                    <div className="flex gap-4">
                      <div className={`mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${
                        n.type === 'ALERT' ? 'bg-rose-500/20 text-rose-500 px-3' : 
                        n.type === 'REQUEST' ? 'bg-amber-500/20 text-amber-500 px-3' :
                        n.type === 'SUCCESS' ? 'bg-emerald-500/20 text-emerald-500 px-3' : 'bg-blue-500/20 text-blue-500 px-3'
                      }`}>
                         {n.type === 'ALERT' ? <AlertTriangle width={20} height={20} className="animate-pulse" /> : 
                          n.type === 'REQUEST' ? <Clock width={20} height={20} /> :
                          n.type === 'SUCCESS' ? <CheckCircle width={20} height={20} /> : <Info width={20} height={20} />}
                      </div>

                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                           <h4 className="text-xs font-black text-white leading-tight">{n.title}</h4>                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter whitespace-nowrap">{getTimeAgo(n.createdAt)}</span>
                        </div>
                        <p className="text-[11px] text-slate-300 font-medium leading-relaxed">{n.message}</p>

                        <div className="flex items-center gap-2 mt-4">
                          <button 
                            onClick={() => openDetails(n)}
                            className="text-[10px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-[0.2em] flex items-center gap-1.5"
                          >
                            Vedi Dettagli <ChevronRight width={12} height={12} />
                          </button>
                          
                          <div className="ml-auto flex items-center gap-3">
                             {activeTab !== 'ARCHIVED' && (
                               <button onClick={() => handleArchive(n.id)} className="text-[9px] font-bold text-slate-400 hover:text-indigo-400 uppercase tracking-widest transition-colors">
                                 Archivia
                               </button>
                             )}
                             {!n.isRead && (
                               <button onClick={() => markAsRead(n.id)} className="text-[9px] font-black text-emerald-400 hover:text-emerald-300 uppercase tracking-widest">
                                 Letta
                               </button>
                             )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 bg-white/5 border-t border-white/5 flex gap-4">
             <button onClick={() => markAsRead()} className="flex-1 bg-white/5 hover:bg-white/10 text-slate-400 py-3 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] transition-all">
                Lette tutte
             </button>
             <button onClick={() => handleArchive()} className="flex-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 py-3 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] transition-all">
                Archivia Tutte
             </button>
          </div>
        </div>
      )}
      {/* MODALE DETTAGLI SENTINEL HUB */}
      {selectedNotification && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setSelectedNotification(null)}></div>
          <div className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 my-auto flex flex-col max-h-[90vh]">
            
            {/* Timbro Digitale */}
            <DigitalStamp status={detailData?.status as string | undefined} />

            {/* Header Modale */}
            <div className={`p-8 bg-gradient-to-r flex justify-between items-start text-white ${
              selectedNotification.type === 'ALERT' ? 'from-rose-600 to-rose-700' :
              selectedNotification.type === 'REQUEST' ? 'from-indigo-600 to-indigo-700' :
              'from-slate-800 to-slate-900'
            }`}>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-2xl border border-white/20">
                  {selectedNotification.type === 'ALERT' ? <AlertTriangle width={24} height={24} /> : <Info width={24} height={24} />}
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight">{selectedNotification.title}</h3>
                  <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mt-1">S.A.M.S. Dettaglio Notifica</p>
                </div>
              </div>
              <button onClick={() => setSelectedNotification(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X width={24} height={24} />
              </button>
            </div>

            <div className="p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-500">
                  <Clock width={14} height={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">{getTimeAgo(selectedNotification.createdAt)}</span>
                </div>
                <p className="text-white text-sm leading-relaxed font-medium">{selectedNotification.message}</p>
              </div>

              {detailLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-4">
                  <RefreshCw width={32} height={32} className="text-indigo-500 animate-spin" />
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Recupero dati...</p>
                </div>
              ) : detailData ? (
                <div className="mt-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  {/* DETTAGLI SCAMBIO */}
                  {detailData.type === 'SWAP' && (
                    <div className="space-y-4">
                       <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                          <Calendar className="text-indigo-400" width={20} height={20} />
                          <div>
                            <p className="text-[9px] text-slate-500 font-bold uppercase">Data Scambio</p>
                            <p className="text-sm font-black text-white">{new Date(detailData.shift.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                          </div>
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                             <p className="text-[9px] font-black uppercase text-indigo-400 mb-1">Richiedente</p>
                             <p className="text-sm font-black text-white">{detailData.requester.name}</p>
                             <p className="text-[10px] text-slate-400">{getLabel(detailData.shift.type)}</p>
                          </div>
                          <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                             <p className="text-[9px] font-black uppercase text-indigo-400 mb-1">Ricevente</p>
                             <p className="text-sm font-black text-white">{detailData.targetUser?.name}</p>
                             <p className="text-[10px] text-indigo-300">{getLabel(detailData.targetShift?.type || 'RIPOSO')}</p>
                          </div>
                       </div>
                    </div>
                  )}

                  {/* DETTAGLI RICHIESTA */}
                  {detailData.type === 'REQUEST' && (
                    <div className="space-y-4">
                       <div className="flex items-center gap-4">
                          <div className="flex-1 p-4 bg-white/5 rounded-2xl border border-white/5">
                             <User className="text-indigo-400 mb-2" width={16} height={16} />
                             <p className="text-sm font-black text-white">{detailData.user?.name}</p>
                             <p className="text-[10px] text-slate-500">Operatore Richiedente</p>
                          </div>
                          <div className="flex-1 p-4 bg-white/5 rounded-2xl border border-white/5">
                             <Calendar className="text-indigo-400 mb-2" width={16} height={16} />
                             <p className="text-sm font-black text-white">
                                {new Date(detailData.date).toLocaleDateString('it-IT')} 
                                {detailData.endDate && new Date(detailData.endDate).getTime() !== new Date(detailData.date).getTime() 
                                   ? ` al ${new Date(detailData.endDate).toLocaleDateString('it-IT')}` 
                                   : ''}
                             </p>
                             <p className="text-[10px] text-slate-500">Motivo: {getLabel(detailData.code)}</p>
                          </div>
                       </div>
                       
                       {/* Mostra Data Elaborazione e Stato (se non è in attesa) */}
                       {detailData.status !== 'PENDING' && (
                         <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                            <p className="text-[9px] font-black uppercase text-slate-500 mb-1">Stato Pratica</p>
                            <p className={`text-sm font-black ${detailData.status === 'APPROVED' ? 'text-emerald-400' : 'text-rose-400'}`}>
                               {detailData.status === 'APPROVED' ? 'APPROVATA' : 'RIFIUTATA'}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-1">
                               Aggiornata il: {new Date(detailData.updatedAt || detailData.createdAt).toLocaleDateString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                         </div>
                       )}
                    </div>
                  )}

                  {/* DETTAGLI EMERGENZA SOS AUDIO */}
                  {detailData.type === 'ALERT' && (
                    <div className="space-y-4">
                       {detailData.audio ? (
                          <div className="p-4 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                             <p className="text-[9px] font-black uppercase text-rose-400 mb-2">🔴 Messaggio Vocale Operatore</p>
                             <audio controls src={detailData.audio} className="w-full h-10 rounded-lg outline-none" />
                          </div>
                       ) : (
                          <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                             <p className="text-[9px] font-black uppercase text-slate-400 text-center">Nessun file audio allegato all&apos;emergenza</p>
                          </div>
                       )}
                       {detailData.lat && detailData.lng && (
                          <a href={`https://www.google.com/maps?q=${detailData.lat},${detailData.lng}`} target="_blank" rel="noreferrer" className="block w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest text-center border border-white/5 transition-all">📍 APRI POSIZIONE GPS MAPS</a>
                       )}
                    </div>
                  )}

                  {/* Azioni Modale - Gli scambi per gli admin sono in ACCEPTED, le richieste in PENDING */}
                  {(detailData.status === 'PENDING' || (detailData.type === 'SWAP' && detailData.status === 'ACCEPTED')) && (
                    <div className="flex gap-4 pt-4">
                      <button onClick={() => handleAction(selectedNotification.id, "ACCEPT", selectedNotification.metadata || {})} className="flex-1 bg-white hover:bg-slate-100 text-slate-900 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all">APPROVA</button>
                      <button onClick={() => handleAction(selectedNotification.id, "REJECT", selectedNotification.metadata || {})} className="flex-1 bg-slate-800 hover:bg-rose-600/20 hover:text-rose-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest border border-white/5 transition-all">RIFIUTA</button>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <div className="p-6 border-t border-white/5 bg-black/20 text-center relative z-0">
               <p className="text-[8px] text-slate-600 font-black uppercase tracking-[0.3em]">Sentinel Autonomous Monitoring System</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
