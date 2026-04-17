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

      {/* Main Premium Hub Card */}
      <div className="bg-[#0f172a] text-white rounded-[2rem] sm:rounded-[3rem] p-5 sm:p-10 shadow-2xl relative overflow-hidden border border-white/5 mx-2 sm:mx-0">
        {/* Background Decorative Effects */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] -mr-64 -mt-64 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px] -ml-48 -mb-48 pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col xl:flex-row gap-12 items-start justify-between">
          <div className="flex-1 space-y-12 w-full">
            {/* 1. Header Identity */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                 <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,211,238,0.8)]"></div>
                 <span className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.4em] opacity-80">Sentinel Hub 2.0</span>
              </div>
              <h2 className="text-4xl sm:text-6xl font-black tracking-tighter leading-none">
                Ciao, {currentUser?.name?.split(" ")[0]}! 👋
              </h2>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[11px] opacity-70">Postazione operativa digitale &middot; Comando Altamura</p>
            </div>

            {/* 2. Primary Controls: Clocking & Navigation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {/* Clocking Controls */}
               <div className="flex items-center gap-2 p-1.5 bg-white/5 rounded-[2.5rem] border border-white/10 backdrop-blur-md">
                  <button
                    disabled={clockLoading || isClockedIn === 'IN'}
                    onClick={() => handleClockAction('IN')}
                    className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-[2rem] font-black text-[11px] uppercase tracking-widest transition-all ${
                      isClockedIn === 'IN'
                        ? 'bg-white/5 text-white/20 cursor-not-allowed opacity-50'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-xl shadow-emerald-900/50 active:scale-95'
                    }`}
                  >
                    {clockLoading && isClockedIn !== 'OUT' ? <RefreshCw size={16} className="animate-spin" /> : <MapPin size={16} />}
                    Entra
                  </button>
                  <button
                    disabled={clockLoading || isClockedIn !== 'IN'}
                    onClick={() => handleClockAction('OUT')}
                    className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-[2rem] font-black text-[11px] uppercase tracking-widest transition-all ${
                      isClockedIn !== 'IN'
                        ? 'bg-white/5 text-white/20 cursor-not-allowed opacity-50'
                        : 'bg-rose-500 hover:bg-rose-400 text-white shadow-xl shadow-rose-900/50 active:scale-95'
                    }`}
                  >
                    {clockLoading && isClockedIn === 'IN' ? <RefreshCw size={16} className="animate-spin" /> : <ArrowRightLeft size={16} />}
                    Esci
                  </button>
               </div>

               {/* Month Navigator */}
               <div className="flex bg-white/5 backdrop-blur-xl rounded-[2.5rem] p-1.5 border border-white/10 shadow-lg items-center">
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
            </div>

            {/* 3. Status Bar: Profile & Telegram */}
            <div className="flex flex-col sm:flex-row items-center gap-8 pt-8 border-t border-white/5">
              <div className="flex items-center gap-5">
                <div className="relative group">
                  <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-blue-600 to-cyan-400 p-0.5 shadow-2xl group-hover:rotate-6 transition-transform">
                    <div className="w-full h-full rounded-[1.9rem] bg-[#0f172a] flex items-center justify-center text-3xl font-black text-white">
                      {currentUser.name?.charAt(0)}
                    </div>
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-4 border-[#0f172a] shadow-lg ${isClockedIn === 'IN' ? 'bg-emerald-500' : 'bg-slate-700'}`}></div>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white tracking-tight leading-none mb-2">{currentUser.name}</h3>
                  <div className="flex gap-3">
                    <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest bg-cyan-400/10 px-3 py-1 rounded-lg">Matr. {currentUser.matricola}</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{currentUser.qualifica || "Agente Scelto"}</span>
                  </div>
                </div>
              </div>

              <div className="sm:ml-auto w-full sm:w-auto">
                {!currentUser.telegramChatId ? (
                  <button 
                    onClick={onGenerateTelegramCode}
                    disabled={telegramLoading}
                    className="w-full sm:w-auto bg-[#0088cc] hover:bg-[#0077b5] text-white px-8 py-4 rounded-[2rem] text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-blue-500/20 border-b-4 border-blue-800"
                  >
                    {telegramLoading ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
                    {telegramCode ? `Codice: ${telegramCode}` : "Attiva Telegram"}
                  </button>
                ) : (
                  <div className="flex items-center justify-center gap-3 px-6 py-4 bg-emerald-500/10 border border-emerald-500/20 rounded-[2rem] text-emerald-400 backdrop-blur-md">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest">Collegato a Telegram</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* 4. Secondary Side Widgets (Always Aligned Properly) */}
          <div className="flex flex-col gap-6 w-full xl:w-[320px] shrink-0">
            <div className="grid grid-cols-2 xl:grid-cols-1 gap-4">
              <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-6 rounded-[2.5rem] flex flex-col justify-between h-40 group hover:bg-white/10 transition-colors">
                <div className="p-4 bg-emerald-500/20 border border-emerald-400/30 rounded-2xl w-fit group-hover:scale-110 transition-transform">
                  <ShieldCheck className="text-emerald-400" size={24} />
                </div>
                <div>
                  <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-1">Reperibilità</p>
                  <p className="text-4xl font-black text-white">{repCount}</p>
                </div>
              </div>

              <button 
                onClick={() => setShowSosModal(true)}
                className="bg-rose-600 hover:bg-rose-500 p-6 rounded-[2.5rem] flex flex-col justify-between h-40 shadow-2xl shadow-rose-900/40 transition-all active:scale-95 group border border-rose-400/20"
              >
                <div className="p-4 bg-white/20 rounded-2xl w-fit group-hover:scale-110 transition-transform">
                  <Shield className="text-white" size={24} />
                </div>
                <div className="text-left">
                  <p className="text-[10px] text-white/60 font-black uppercase tracking-widest mb-1">S.O.S.</p>
                  <p className="text-xl font-black text-white uppercase tracking-tighter">Emergenza</p>
                </div>
              </button>
            </div>
            
            <div className="flex flex-col gap-4">
              {(userRole === "ADMIN" || canManageShifts) && (
                <Link
                  href={`/${tenantSlug || "admin"}/admin/pannello`}
                  className="w-full flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-500 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-900/40 transition-all active:scale-95 border-b-4 border-indigo-800"
                >
                  <ShieldCheck size={20} />
                  Area Commando
                </Link>
              )}
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowSwapModal(true)}
                  className="flex-1 flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 text-white py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-widest border border-white/10 transition-all active:scale-95 backdrop-blur-sm"
                >
                  <RefreshCw size={18} /> Scambi
                </button>
                <button 
                  onClick={() => setShowSyncModal(true)}
                  className="flex-1 flex items-center justify-center gap-3 bg-white text-[#0f172a] py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-2xl"
                >
                  <CalendarDays size={18} className="text-blue-600" /> PWA
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
