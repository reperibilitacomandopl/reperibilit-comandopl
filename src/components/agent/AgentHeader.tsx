"use client"
import React from "react"
import Link from "next/link"
import { ShieldCheck, CalendarDays, Clock, Users, ArrowRightLeft, MapPin, RefreshCw, ChevronLeft, ChevronRight, CheckCircle2, X, Shield, Smartphone, Send, LogOut, Lock, Eye } from "lucide-react"
import TwoFactorSetupModal from "../TwoFactorSetupModal"
import HoldButton from "../ui/HoldButton"

export default function AgentHeader({
  currentUser,
  currentMonth,
  currentYear,
  prevMonth,
  prevYear,
  nextMonth,
  nextYear,
  monthNames,
  onMonthChange,
  
  isClockedIn,
  lastClockTime,
  clockLoading,
  handleClockAction,
  
  repCount,
  repDays,
  
  canManageShifts,
  userRole,
  tenantSlug,
  
  setShowSwapModal,
  setShowSyncModal,
  setShowSosModal,
  telegramCode,
  onGenerateTelegramCode,
  telegramLoading,
  signOutAction,
  logoUrl
}: any) {
  const [show2faSetup, setShow2faSetup] = React.useState(false)
  const [telegramOptIn, setTelegramOptIn] = React.useState(currentUser?.telegramOptIn !== false) // Default true se non esplicitamente false
  const [currentTime, setCurrentTime] = React.useState(new Date())
  
  const handleToggleOptIn = async () => {
    const newValue = !telegramOptIn
    setTelegramOptIn(newValue)
    try {
      await fetch('/api/user/telegram-optin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optIn: newValue })
      })
    } catch (e) {
      console.error(e)
    }
  }

  React.useEffect(() => {
    try {
      if (localStorage.getItem('high-contrast') === 'true') {
        document.documentElement.classList.add('theme-high-contrast');
      }
    } catch (e) {}
  }, []);

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-700">
      {/* Widget in servizio */}
      {isClockedIn === 'IN' && (
        <div className="px-2 mb-6">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-5 text-white shadow-xl shadow-emerald-500/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform">
              <Clock size={80} className="animate-spin-slow" style={{ animationDuration: '10s' }} />
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center animate-pulse">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h3 className="font-black text-lg uppercase leading-none mb-1">Sei in Servizio! 👮‍♂️</h3>
                  <p className="text-white/80 text-xs font-bold uppercase tracking-wider">
                    Iniziato alle <span className="text-white underline decoration-emerald-300 decoration-2 underline-offset-2">{lastClockTime}</span>
                  </p>
                </div>
              </div>
              
              <button 
                onClick={() => handleClockAction('OUT')}
                disabled={clockLoading}
                className="bg-white text-emerald-700 hover:bg-emerald-50 px-8 py-3 rounded-2xl font-black text-sm uppercase tracking-tighter shadow-lg active:scale-95 transition-all flex items-center gap-2"
                aria-label="Termina Turno"
              >
                {clockLoading ? (
                  <RefreshCw size={18} className="animate-spin" />
                ) : <X size={18} />}
                Termina Turno Ora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Premium Hub Card */}
      <div className="bg-[#0f172a] text-white rounded-[1.5rem] sm:rounded-[3rem] p-4 sm:p-10 shadow-2xl relative overflow-hidden border border-white/5 mx-0 sm:mx-0">
        {/* Background Decorative Effects */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] -mr-64 -mt-64 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px] -ml-48 -mb-48 pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col xl:flex-row gap-12 items-start justify-between">
          <div className="flex-1 space-y-6 sm:space-y-12 w-full">
            {/* 1. Header Identity */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {logoUrl ? (
                   <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center p-1 shadow-xl">
                      <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                   </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,211,238,0.8)]"></div>
                    <span className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.4em] opacity-80">Sentinel Hub 3.0</span>
                  </div>
                )}
              </div>
              <h2 className="text-2xl sm:text-4xl md:text-6xl font-black tracking-tighter leading-none">
                Ciao, {currentUser?.name?.split(" ")[0]}! 👋
              </h2>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[11px] opacity-70">Postazione operativa digitale &middot; Sentinel Hub</p>
            </div>

            {/* 2. Primary Controls: Clocking & Navigation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {/* Digital Clock & Controls */}
               <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between px-4 py-2 bg-slate-900 rounded-2xl border border-white/10 shadow-inner">
                    <div className="flex items-center gap-2 text-white/50">
                      <Clock size={14} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Ora Attuale</span>
                    </div>
                    <span className="text-xl font-black text-white tracking-tighter font-mono">
                      {currentTime.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 p-1.5 bg-white/5 rounded-[2.5rem] border border-white/10 backdrop-blur-md">
                    <button
                      disabled={clockLoading || isClockedIn === 'IN' || !currentUser?.gpsConsent}
                      onClick={() => handleClockAction('IN')}
                      className={`flex-1 flex items-center justify-center py-4 rounded-[2rem] font-black text-[11px] uppercase tracking-widest transition-all ${
                        isClockedIn === 'IN'
                          ? 'bg-white/5 text-white/20 cursor-not-allowed opacity-50'
                          : !currentUser?.gpsConsent
                            ? 'bg-amber-500/20 text-amber-500 cursor-not-allowed'
                            : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-xl shadow-emerald-900/50 active:scale-95'
                      }`}
                    >
                      {clockLoading && isClockedIn !== 'OUT' ? <RefreshCw size={16} className="animate-spin" /> : (!currentUser?.gpsConsent ? 'Consenso GPS' : 'Entra')}
                    </button>
                    <button
                      disabled={clockLoading || isClockedIn !== 'IN'}
                      onClick={() => handleClockAction('OUT')}
                      className={`flex-1 flex items-center justify-center py-4 rounded-[2rem] font-black text-[11px] uppercase tracking-widest transition-all ${
                        isClockedIn !== 'IN'
                          ? 'bg-white/5 text-white/20 cursor-not-allowed opacity-50'
                          : 'bg-rose-500 hover:bg-rose-400 text-white shadow-xl shadow-rose-900/50 active:scale-95'
                      }`}
                    >
                      {clockLoading && isClockedIn === 'IN' ? <RefreshCw size={16} className="animate-spin" /> : 'Esci'}
                    </button>
                  </div>
               </div>

               {/* Month Navigator & Logout */}
               <div className="flex gap-2">
                  <div className="flex-1 flex bg-white/5 backdrop-blur-xl rounded-[2.5rem] p-1.5 border border-white/10 shadow-lg items-center">
                    <button 
                      type="button"
                      onClick={() => onMonthChange(prevMonth, prevYear)} 
                      className="p-3.5 hover:bg-white/10 text-white rounded-3xl transition-all active:scale-75"
                    >
                      <ChevronLeft size={22} />
                    </button>
                    <div className="flex-1 text-center">
                      <span className="text-xs font-black uppercase tracking-[0.2em] text-white">
                        {monthNames[currentMonth-1]} <span className="text-cyan-400">{currentYear}</span>
                      </span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => onMonthChange(nextMonth, nextYear)} 
                      className="p-3.5 hover:bg-white/10 text-white rounded-3xl transition-all active:scale-75"
                    >
                      <ChevronRight size={22} />
                    </button>
                  </div>

                  {/* REAL LOGOUT BUTTON */}
                  <form action={async () => {
                    if (confirm("Vuoi davvero disconnetterti dal sistema?")) {
                      await signOutAction();
                    }
                  }} className="shrink-0">
                    <button
                      type="submit"
                      className="h-full px-6 flex items-center justify-center bg-white/5 hover:bg-rose-600 border border-white/10 text-white/40 hover:text-white rounded-[2rem] transition-all group"
                      title="Disconnetti Sessione (Logout)"
                    >
                      <LogOut size={20} className="group-hover:scale-110 transition-transform" />
                    </button>
                  </form>
               </div>
            </div>

            {/* 3. Status Bar: Profile & Telegram */}
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 pt-4 sm:pt-8 border-t border-white/5">
              <div className="flex items-center gap-5">
                <div className="relative group">
                  <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-[1.5rem] sm:rounded-[2rem] bg-gradient-to-br from-blue-600 to-cyan-400 p-0.5 shadow-2xl group-hover:rotate-6 transition-transform">
                    <div className="w-full h-full rounded-[1.4rem] sm:rounded-[1.9rem] bg-[#0f172a] flex items-center justify-center text-xl sm:text-3xl font-black text-white">
                      {currentUser.name?.charAt(0)}
                    </div>
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-4 border-[#0f172a] shadow-lg ${isClockedIn === 'IN' ? 'bg-emerald-500' : 'bg-slate-700'}`}></div>
                </div>
                <div>
                  <h3 className="text-lg sm:text-2xl font-black text-white tracking-tight leading-none mb-1 sm:mb-2">{currentUser.name}</h3>
                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest bg-cyan-400/10 px-3 py-1 rounded-lg">Matr. {currentUser.matricola}</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{currentUser.qualifica || "Agente Scelto"}</span>
                  </div>
                </div>
              </div>

              <div className="sm:ml-auto flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                <button 
                  onClick={() => {
                    const html = document.documentElement;
                    const isHC = html.classList.toggle('theme-high-contrast');
                    try { localStorage.setItem('high-contrast', isHC ? 'true' : 'false'); } catch (e) {}
                  }}
                  className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-[1.5rem] sm:rounded-[2rem] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 border border-white/5"
                  title="Attiva/Disattiva Tema Scuro / Alto Contrasto"
                >
                  <Eye size={16} /> Tema Scuro
                </button>

                {!currentUser.twoFactorEnabled && (
                  <button 
                    onClick={() => setShow2faSetup(true)}
                    className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 sm:px-6 py-3 sm:py-4 rounded-[1.5rem] sm:rounded-[2rem] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 border border-white/5"
                  >
                    <Lock size={16} /> Proteggi Account (2FA)
                  </button>
                )}

                {!currentUser.telegramChatId ? (
                  <button 
                    onClick={onGenerateTelegramCode}
                    disabled={telegramLoading}
                    className="w-full sm:w-auto bg-[#0088cc] hover:bg-[#0077b5] text-white px-6 sm:px-8 py-3 sm:py-4 rounded-[1.5rem] sm:rounded-[2rem] text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-blue-500/20 border-b-4 border-blue-800"
                    aria-label="Attiva Notifiche Telegram"
                  >
                    {telegramLoading ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
                    {telegramCode ? `Codice: ${telegramCode}` : "Attiva Telegram"}
                  </button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-center gap-3 px-6 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-[2rem] text-emerald-400 backdrop-blur-md">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                      <span className="text-[10px] font-black uppercase tracking-widest">Collegato a Telegram</span>
                    </div>
                    <label className="flex items-center justify-center gap-2 cursor-pointer text-slate-300 hover:text-white transition-colors">
                      <input 
                        type="checkbox" 
                        checked={telegramOptIn}
                        onChange={handleToggleOptIn}
                        className="w-4 h-4 rounded border-white/10 bg-white/5 text-blue-500 focus:ring-blue-500/50" 
                      />
                      <span className="text-[10px] font-bold tracking-widest uppercase">Ricevi Notifiche (GDPR)</span>
                    </label>
                  </div>
                )}
              </div>
            </div>

            {show2faSetup && <TwoFactorSetupModal onClose={() => setShow2faSetup(false)} />}
          </div>
          
          {/* 4. Secondary Side Widgets (Always Aligned Properly) */}
          <div className="flex flex-col gap-6 w-full xl:w-[320px] shrink-0">
            <div className="grid grid-cols-2 xl:grid-cols-1 gap-4">
              <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-4 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] flex flex-col justify-between h-32 sm:h-40 group hover:bg-white/10 transition-colors">
                <div className="p-4 bg-emerald-500/20 border border-emerald-400/30 rounded-2xl w-fit group-hover:scale-110 transition-transform">
                  <ShieldCheck className="text-emerald-400" size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-1">Reperibilità</p>
                  <p className="text-4xl font-black text-white">{repCount}</p>
                  {repDays && repDays.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2 max-h-16 overflow-y-auto">
                      {repDays.map((d: { day: number; repType?: string }) => (
                        <span
                          key={d.day}
                          className="text-[9px] font-black bg-emerald-500/30 text-emerald-100 px-1.5 py-0.5 rounded-md border border-emerald-400/20"
                        >
                          {d.day}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <HoldButton 
                onHoldComplete={() => setShowSosModal(true)}
                className="bg-rose-600 hover:bg-rose-500 p-4 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] flex flex-col justify-between h-32 sm:h-40 shadow-2xl shadow-rose-900/40 transition-all active:scale-95 group border border-rose-400/20 relative overflow-hidden"
                aria-label="Invia SOS Emergenza (Tieni premuto)"
              >
                {(pressing, progress) => (
                  <>
                    {pressing && (
                      <div 
                        className="absolute bottom-0 left-0 h-2 bg-white/40 transition-all"
                        style={{ width: `${progress * 100}%` }}
                      />
                    )}
                    <div className={`p-4 rounded-2xl w-fit transition-transform ${pressing ? 'bg-white/40 scale-110 animate-pulse' : 'bg-white/20 group-hover:scale-110'}`}>
                      <Shield className="text-white" size={24} />
                    </div>
                    <div className="text-left relative z-10">
                      <p className="text-[10px] text-white/60 font-black uppercase tracking-widest mb-1">
                        {pressing ? "TIENI PREMUTO..." : "S.O.S."}
                      </p>
                      <p className="text-xl font-black text-white uppercase tracking-tighter">Emergenza</p>
                    </div>
                  </>
                )}
              </HoldButton>
              
              <Link 
                href={`/${tenantSlug || ''}/agent/posti-controllo`}
                className="bg-blue-600 hover:bg-blue-500 p-4 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] flex flex-col justify-between h-32 sm:h-40 shadow-2xl shadow-blue-900/40 transition-all active:scale-95 group border border-blue-400/20 col-span-2 xl:col-span-1"
              >
                <div className="p-4 bg-white/20 rounded-2xl w-fit group-hover:scale-110 transition-transform">
                  <ShieldCheck className="text-white" size={24} />
                </div>
                <div className="text-left relative z-10">
                  <p className="text-[10px] text-blue-200 font-black uppercase tracking-widest mb-1">
                    Gestione
                  </p>
                  <p className="text-xl font-black text-white uppercase tracking-tighter">Posti di Controllo</p>
                </div>
              </Link>
            </div>
            
            <div className="flex flex-col gap-4">
              {(userRole === "ADMIN" || canManageShifts) && (
                <Link
                  href={`/${tenantSlug || "admin"}/admin/pannello`}
                  className="w-full flex items-center justify-center gap-2 sm:gap-3 bg-indigo-600 hover:bg-indigo-500 text-white py-4 sm:py-5 rounded-[1.5rem] sm:rounded-[2rem] font-black text-[10px] sm:text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-900/40 transition-all active:scale-95 border-b-4 border-indigo-800"
                >
                  <ShieldCheck size={18} className="sm:w-5 sm:h-5" />
                  Area Comando
                </Link>
              )}
              <div className="flex gap-3 sm:gap-4">
                <button 
                  onClick={() => setShowSwapModal(true)}
                  className="flex-1 flex items-center justify-center gap-2 sm:gap-3 bg-white/5 hover:bg-white/10 text-white py-4 sm:py-5 rounded-[1.5rem] sm:rounded-[2rem] font-black text-[9px] sm:text-[10px] uppercase tracking-widest border border-white/10 transition-all active:scale-95 backdrop-blur-sm"
                  aria-label="Gestione Scambi Turni"
                >
                  <RefreshCw size={16} className="sm:w-[18px] sm:h-[18px]" /> Scambi
                </button>
                <button 
                  onClick={() => setShowSyncModal(true)}
                  className="flex-1 flex items-center justify-center gap-2 sm:gap-3 bg-white text-[#0f172a] py-4 sm:py-5 rounded-[1.5rem] sm:rounded-[2rem] font-black text-[9px] sm:text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-2xl"
                  aria-label="Sincronizza Calendario"
                >
                  <CalendarDays size={16} className="text-blue-600 sm:w-[18px] sm:h-[18px]" /> Sincro
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
