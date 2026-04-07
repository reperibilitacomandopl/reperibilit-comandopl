"use client"

import { useState, useEffect, useRef } from "react"
import { Bell, Check, Info, AlertTriangle, CheckCircle, Clock } from "lucide-react"

type NotificationType = "REQUEST" | "SUCCESS" | "ALERT" | "INFO"

interface Notification {
  id: string
  title: string
  message: string
  type: NotificationType
  link?: string
  isRead: boolean
  createdAt: string
}

export default function NotificationHub() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications")
      const data = await res.json()
      if (data.success) {
        setNotifications(data.notifications)
        setUnreadCount(data.unreadCount)
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error)
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
      if (res.ok) {
        fetchNotifications()
      }
    } catch (error) {
      console.error("Failed to mark notifications as read:", error)
    }
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60000) // Poll every minute
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case "REQUEST": return <Clock className="text-amber-500" size={16} />
      case "SUCCESS": return <CheckCircle className="text-emerald-500" size={16} />
      case "ALERT": return <AlertTriangle className="text-rose-500" size={16} />
      default: return <Info className="text-blue-500" size={16} />
    }
  }

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return "Proprio ora"
    if (diffMins < 60) return `${diffMins} min fa`
    if (diffHours < 24) return `${diffHours} ore fa`
    return `${diffDays} giorni fa`
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
        title="Notifiche"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-slate-900 shadow-lg animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
            <h3 className="text-sm font-black text-white uppercase tracking-wider">Centro Notifiche</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAsRead()}
                className="text-[10px] font-bold text-blue-400 hover:text-blue-300 uppercase tracking-widest transition-colors"
              >
                Segna tutte come lette
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-slate-500 text-xs font-medium">Nessuna notifica presente.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/50">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-4 flex gap-3 transition-colors hover:bg-white/5 cursor-pointer relative ${!n.isRead ? 'bg-blue-500/5' : ''}`}
                    onClick={() => {
                        if(!n.isRead) markAsRead(n.id)
                        if(n.link) window.location.href = n.link
                    }}
                  >
                    {!n.isRead && (
                      <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-full" />
                    )}
                    <div className="mt-0.5 shrink-0">
                      {getTypeIcon(n.type)}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-xs font-bold text-white leading-snug">{n.title}</p>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed font-medium">
                        {n.message}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                          {getTimeAgo(n.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 bg-slate-900/80 border-t border-slate-800 text-center">
             <button className="text-[10px] text-slate-500 font-bold uppercase hover:text-slate-300 transition-colors">
               Vedi tutte le attività
             </button>
          </div>
        </div>
      )}
    </div>
  )
}
