import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Shield, AlertTriangle, CheckCircle2, XCircle, FileWarning, Smartphone, UserCheck } from "lucide-react"

export default async function CompliancePage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const session = await auth()
  const { tenantSlug } = await params

  if (!session?.user || (session.user.role !== "ADMIN" && !session.user.canManageUsers)) {
    redirect("/login")
  }

  const tenantId = session.user.tenantId

  const users = await prisma.user.findMany({
    where: { 
      tenantId,
      role: "AGENTE",
      isActive: true
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      matricola: true,
      scadenzaPatente: true,
      scadenzaPortoArmi: true,
      gpsConsent: true,
      privacyConsent: true,
      telegramChatId: true,
      telegramOptIn: true
    }
  })

  const now = new Date()
  const in30Days = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000))

  const getStatus = (date: Date | null) => {
    if (!date) return "MISSING"
    if (date < now) return "EXPIRED"
    if (date < in30Days) return "WARNING"
    return "OK"
  }

  const stats = {
    total: users.length,
    ok: users.filter(u => 
      getStatus(u.scadenzaPatente) === "OK" && 
      getStatus(u.scadenzaPortoArmi) === "OK" && 
      u.privacyConsent
    ).length,
    warning: users.filter(u => 
      getStatus(u.scadenzaPatente) === "WARNING" || 
      getStatus(u.scadenzaPortoArmi) === "WARNING"
    ).length,
    critical: users.filter(u => 
      getStatus(u.scadenzaPatente) === "EXPIRED" || 
      getStatus(u.scadenzaPortoArmi) === "EXPIRED" ||
      !u.privacyConsent
    ).length
  }

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase flex items-center gap-3">
            <Shield className="text-indigo-500" size={36} /> Dashboard <span className="text-indigo-400">Compliance</span>
          </h1>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-2">Monitoraggio Salute Burocratica e Consensi Operativi</p>
        </div>
        
        <div className="flex gap-4">
          <div className="bg-slate-900 border border-white/5 rounded-2xl p-4 flex flex-col items-center min-w-[100px]">
            <span className="text-[10px] font-black text-slate-500 uppercase">Totale</span>
            <span className="text-2xl font-black text-white">{stats.total}</span>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex flex-col items-center min-w-[100px]">
            <span className="text-[10px] font-black text-emerald-400 uppercase">In Regola</span>
            <span className="text-2xl font-black text-emerald-400">{stats.ok}</span>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex flex-col items-center min-w-[100px]">
            <span className="text-[10px] font-black text-amber-400 uppercase">Alert 30gg</span>
            <span className="text-2xl font-black text-amber-400">{stats.warning}</span>
          </div>
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex flex-col items-center min-w-[100px]">
            <span className="text-[10px] font-black text-rose-400 uppercase">Criticità</span>
            <span className="text-2xl font-black text-rose-400">{stats.critical}</span>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl backdrop-blur-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900/80 border-b border-white/5">
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Agente / Matr.</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Patente</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Porto d'Armi</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Privacy GDPR</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">GPS SOS</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Telegram</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {users.map(user => {
              const patenteStatus = getStatus(user.scadenzaPatente)
              const armiStatus = getStatus(user.scadenzaPortoArmi)
              
              return (
                <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-black text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-black text-white leading-none mb-1">{user.name}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Matr. {user.matricola}</p>
                      </div>
                    </div>
                  </td>

                  {/* Patente */}
                  <td className="px-6 py-5 text-center">
                    <ComplianceBadge status={patenteStatus} date={user.scadenzaPatente} />
                  </td>

                  {/* Porto Armi */}
                  <td className="px-6 py-5 text-center">
                    <ComplianceBadge status={armiStatus} date={user.scadenzaPortoArmi} />
                  </td>

                  {/* Privacy */}
                  <td className="px-6 py-5">
                    <div className="flex justify-center">
                      {user.privacyConsent ? (
                        <div className="flex flex-col items-center gap-1 text-emerald-400">
                          <UserCheck size={18} />
                          <span className="text-[9px] font-black uppercase">Firmato</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-rose-500 animate-pulse">
                          <XCircle size={18} />
                          <span className="text-[9px] font-black uppercase">Mancante</span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* GPS */}
                  <td className="px-6 py-5">
                     <div className="flex justify-center">
                      {user.gpsConsent ? (
                        <div className="flex flex-col items-center gap-1 text-emerald-400">
                          <CheckCircle2 size={18} />
                          <span className="text-[9px] font-black uppercase">Attivo</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-slate-600">
                          <Smartphone size={18} />
                          <span className="text-[9px] font-black uppercase">Disattivo</span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Telegram */}
                  <td className="px-6 py-5">
                    <div className="flex justify-center">
                      {user.telegramChatId ? (
                        <div className={`flex flex-col items-center gap-1 ${user.telegramOptIn ? 'text-blue-400' : 'text-slate-500'}`}>
                          <CheckCircle2 size={18} />
                          <span className="text-[9px] font-black uppercase">{user.telegramOptIn ? 'Opt-In' : 'Opt-Out'}</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-slate-700">
                          <XCircle size={18} />
                          <span className="text-[9px] font-black uppercase">Non Coll.</span>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ComplianceBadge({ status, date }: { status: string, date: Date | null }) {
  const labels = {
    OK: "Valido",
    WARNING: "In Scadenza",
    EXPIRED: "Scaduto",
    MISSING: "Mancante"
  }

  const styles = {
    OK: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    WARNING: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    EXPIRED: "bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse",
    MISSING: "bg-slate-800 text-slate-500 border-white/5"
  }

  const icons = {
    OK: <CheckCircle2 size={12} />,
    WARNING: <AlertTriangle size={12} />,
    EXPIRED: <FileWarning size={12} />,
    MISSING: <XCircle size={12} />
  }

  return (
    <div className={`inline-flex flex-col items-center gap-1 p-2 rounded-xl border w-24 ${styles[status as keyof typeof styles]}`}>
      <div className="flex items-center gap-1">
        {icons[status as keyof typeof icons]}
        <span className="text-[9px] font-black uppercase">{labels[status as keyof typeof labels]}</span>
      </div>
      {date && <span className="text-[9px] font-bold opacity-70">{date.toLocaleDateString('it-IT')}</span>}
    </div>
  )
}
