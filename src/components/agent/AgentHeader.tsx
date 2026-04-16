"use client"
import React from "react"
import Link from "next/link"
import { ShieldCheck, CalendarDays, Clock, Users, ArrowRightLeft, MapPin, RefreshCw, ChevronLeft, ChevronRight, CheckCircle2, X, Shield, Smartphone, Send } from "lucide-react"

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
  
  canManageShifts,
  userRole,
  tenantSlug,
  
  setShowSwapModal,
  setShowSyncModal,
  setShowSosModal,
  telegramCode,
  onGenerateTelegramCode,
  telegramLoading
}: any) {
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

      {/* Main Header Card */}
      <div className="bg-slate-900 text-white rounded-[3rem] p-8 sm:p-10 lg:p-12 shadow-2xl relative overflow-hidden border border-white/5">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] -mr-48 -mt-48 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] -ml-32 -mb-32 pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-10">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
               <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em] opacity-80">Sentinel Hub 2.0</span>
               <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
            </div>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter leading-[0.9] mb-4">
              Ciao, {currentUser?.name?.split(" ")[0]}! 👋
            </h2>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[11px] mb-8 opacity-70">Benvenuto nella tua postazione operativa digitale.</p>
            
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-4 bg-white/5 backdrop-blur-2xl border border-white/10 px-6 py-4 rounded-[2rem] shadow-xl">
                <div className={`p-4 rounded-2xl ${isClockedIn === 'IN' ? 'bg-emerald-500 shadow-lg shadow-emerald-500/40' : 'bg-slate-800 border border-white/5'}`}>
                  <Clock size={24} className={isClockedIn === 'IN' ? 'text-white' : 'text-slate-500'} />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">Status Timbratura</p>
                  <p className="text-sm font-black text-white uppercase tracking-tight">
                    {isClockedIn === 'IN' ? `In Servizio (${lastClockTime})` : 'Fuori Servizio'}
                  </p>
                </div>
              </div>
  
              <div className="flex items-center gap-2 p-1.5 bg-white/5 rounded-[2rem] border border-white/5">
                <button
                  disabled={clockLoading || isClockedIn === 'IN'}
                  onClick={() => handleClockAction('IN')}
                  className={`flex items-center justify-center gap-3 px-8 py-4 rounded-3xl font-black text-xs uppercase tracking-widest transition-all ${
                    isClockedIn === 'IN'
                      ? 'bg-transparent text-white/20 cursor-not-allowed'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-xl shadow-emerald-900/50 active:scale-95'
                  }`}
                >
                  {clockLoading && isClockedIn !== 'OUT' ? (
                    <RefreshCw size={18} className="animate-spin" />
                  ) : <MapPin size={18} />}
                  Entra
                </button>
   
                <button
                  disabled={clockLoading || isClockedIn !== 'IN'}
                  onClick={() => handleClockAction('OUT')}
                  className={`flex items-center justify-center gap-3 px-8 py-4 rounded-3xl font-black text-xs uppercase tracking-widest transition-all ${
                    isClockedIn !== 'IN'
                      ? 'bg-transparent text-white/20 cursor-not-allowed'
                      : 'bg-rose-500 hover:bg-rose-400 text-white shadow-xl shadow-rose-900/50 active:scale-95'
                  }`}
                >
                  {clockLoading && isClockedIn === 'IN' ? (
                    <RefreshCw size={18} className="animate-spin" />
                  ) : <ArrowRightLeft size={18} />}
                  Esci
                </button>
              </div>
            </div>

            <div className="mt-10 flex items-center gap-4">
                <div className="flex bg-white/10 rounded-2xl p-1 border border-white/20 shadow-inner">
                  <button 
                    type="button"
                    onClick={() => onMonthChange(prevMonth, prevYear)} 
                    className="p-3 hover:bg-white/20 rounded-xl transition-all active:scale-75 touch-manipulation"
                    title="Mese Precedente"
                  >
                    <ChevronLeft size={24} className="text-white" />
                  </button>
                  <div className="px-6 flex items-center min-w-[140px] justify-center">
                    <span className="text-sm font-black uppercase tracking-[0.2em] text-white">
                      {monthNames[currentMonth-1]} {currentYear}
                    </span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => onMonthChange(nextMonth, nextYear)} 
                    className="p-3 hover:bg-white/20 rounded-xl transition-all active:scale-75 touch-manipulation"
                    title="Mese Successivo"
                  >
                    <ChevronRight size={24} className="text-white" />
                  </button>
                </div>
               
               {/* Telegram Link Button - Prominent on Mobile */}
               {!currentUser.telegramChatId && (
                 <button 
                  onClick={onGenerateTelegramCode}
                  disabled={telegramLoading}
                  className="bg-[#0088cc] hover:bg-[#0077b5] text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all active:scale-95 shadow-lg shadow-blue-500/20"
                 >
                   {telegramLoading ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                   {telegramCode ? `Codice: ${telegramCode}` : "Telegram"}
                 </button>
               )}
            </div>
          </div>
          
          <div className="flex flex-col gap-5 lg:w-[400px]">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] flex flex-col justify-between">
                <div className="p-3 bg-emerald-500/20 border border-emerald-400/30 rounded-2xl w-fit">
                  <ShieldCheck className="text-emerald-400" size={24} />
                </div>
                <div className="mt-4">
                  <p className="text-[9px] text-white/40 font-black uppercase tracking-[0.2em] mb-1">Reperibilità</p>
                  <p className="text-3xl font-black text-white">{repCount}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowSosModal(true)}
                className="bg-rose-600 hover:bg-rose-500 p-6 rounded-[2rem] flex flex-col justify-between shadow-2xl shadow-rose-900/50 transition-all active:scale-95 group border border-rose-400/20"
              >
                <div className="p-3 bg-white/20 rounded-2xl w-fit group-hover:scale-110 transition-transform">
                  <Shield className="text-white" size={24} />
                </div>
                <div className="mt-4 text-left">
                  <p className="text-[9px] text-white/60 font-black uppercase tracking-[0.2em] mb-1">Emergenza</p>
                  <p className="text-xl font-black text-white uppercase tracking-tighter">Lancia SOS</p>
                </div>
              </button>
            </div>
            
            <div className="flex flex-col gap-3">
              {(userRole === "ADMIN" || canManageShifts) && (
                <Link
                  href={`/${tenantSlug || "admin"}/admin/pannello`}
                  className="flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-500 text-white p-5 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-indigo-900/40 transition-all hover:-translate-y-1 active:scale-95 border border-indigo-400/20"
                >
                  <ShieldCheck size={18} />
                  Amministrazione
                </Link>
              )}
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowSwapModal(true)}
                  className="flex-1 flex items-center justify-center gap-3 bg-white/10 hover:bg-white/20 text-white p-5 rounded-[2rem] font-black text-[10px] uppercase tracking-widest border border-white/10 transition-all active:scale-95"
                >
                  <RefreshCw size={18} /> Scambia
                </button>
                <button 
                  onClick={() => setShowSyncModal(true)}
                  className="flex-1 flex items-center justify-center gap-3 bg-white text-slate-900 p-5 rounded-[2rem] font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-xl"
                >
                  <CalendarDays size={18} className="text-blue-600" /> Sync PWA
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
