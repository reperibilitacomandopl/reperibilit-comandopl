import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { ArrowLeft, User, CalendarDays, Calculator } from "lucide-react"
import { FERIE_CODES, PERMESSI_104_CODES, FESTIVITA_CODES, getLabel } from "@/utils/agenda-codes"

import OperativeAssignmentEditor from "@/components/OperativeAssignmentEditor"

export const dynamic = "force-dynamic"

export default async function AgentDossierPage({ params }: { params: Promise<{ id: string, tenantSlug: string }> }) {
  const { id, tenantSlug } = await params
  const session = await auth()
  if (!session?.user) redirect("/login")

  const year = new Date().getFullYear()

  // Load User with Balances and Requests
  const agent: any = await (prisma.user as any).findUnique({
    where: { id },
    include: {
      agentBalances: { 
        where: { year },
        include: { details: true }
      },
      agentRequests: { orderBy: { date: "desc" } },
      absences: { where: { date: { gte: new Date(`${year}-01-01`), lte: new Date(`${year}-12-31`) } } },
      rotationGroup: true,
      defaultServiceCategory: true
    }
  })

  if (!agent) redirect(`/${tenantSlug}/admin/risorse`)
  
  const tenantId = session.user.tenantId
  const rotationGroups = await prisma.rotationGroup.findMany({ where: { tenantId: tenantId || null }, orderBy: { name: 'asc' } })
  const serviceCategories = await prisma.serviceCategory.findMany({ where: { tenantId: tenantId || null }, include: { types: true }, orderBy: { orderIndex: 'asc' } })

  // Fallback balance se non presente
  let balance = agent.agentBalances?.[0]
  if (!balance) {
     balance = await (prisma as any).agentBalance.create({
        data: { 
          userId: agent.id, 
          year, 
          tenantId: tenantId || null,
          details: {
            create: [
              { code: "FERIE", label: "Ferie Ordinarie", initialValue: 28, unit: "DAYS" },
              { code: "FEST_SOP", label: "Festività Soppresse", initialValue: 4, unit: "DAYS" },
              { code: "104_1", label: "Legge 104", initialValue: 36, unit: "DAYS" }
            ]
          }
        },
        include: { details: true }
     })
  }

  // Helper per estrarre valori
  const getInit = (code: string) => balance.details?.find((d: any) => d.code === code)?.initialValue || 0
  const ferieTot = getInit("FERIE");
  const festTot = getInit("FEST_SOP");
  const p104Tot = getInit("104_1");

  // Calcola assenze consumate usando gli shortCode unificati
  const absences: any[] = agent.absences || []
  const usedFerie = absences.filter((a: any) => FERIE_CODES.includes(a.code)).length
  const used104 = absences.filter((a: any) => PERMESSI_104_CODES.includes(a.code)).length
  const usedFestivita = absences.filter((a: any) => FESTIVITA_CODES.includes(a.code)).length
  
  const remainFerie = ferieTot - usedFerie
  const remain104 = p104Tot - used104

  const agentRequests: any[] = agent.agentRequests || []

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
         <div className="flex items-center gap-4">
            <Link href={`/${tenantSlug}/admin/risorse`} className="p-3 bg-white border border-slate-200 hover:bg-slate-50 transition-colors rounded-xl text-slate-500">
               <ArrowLeft size={20} />
            </Link>
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
               <User size={32} />
            </div>
            <div>
               <h1 className="text-3xl font-black tracking-tight text-slate-900">{agent.name}</h1>
               <p className="text-sm font-bold text-slate-500 tracking-wide uppercase">Matricola: {agent.matricola} • {agent.qualifica}</p>
            </div>
         </div>
         {/* Assegnazione Operativa (Punto Zero) */}
         <OperativeAssignmentEditor 
            agent={agent} 
            rotationGroups={rotationGroups} 
            categories={serviceCategories} 
         />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Totalizzatori */}
         <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden border-t-4 border-t-amber-500">
               <div className="p-6 flex items-center gap-4 border-b border-slate-100">
                 <div className="bg-amber-50 text-amber-600 p-3 rounded-2xl">
                    <Calculator size={24} />
                 </div>
                 <h2 className="text-xl font-black text-slate-800">Bilancio {year}</h2>
               </div>
               
               <div className="p-6 space-y-6">
                 {/* Ferie */}
                 <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                       <span className="font-bold text-slate-700">🏖️ Ferie Ordinarie</span>
                       <span className="font-black text-slate-900">{remainFerie} <span className="text-slate-400 font-bold">su {ferieTot}</span></span>
                    </div>
                    <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                       <div className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all" style={{ width: `${Math.min(100, (usedFerie / ferieTot) * 100)}%` }}></div>
                    </div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wide">Consumate: {usedFerie} giornate</p>
                 </div>

                 {/* 104 */}
                 <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                       <span className="font-bold text-slate-700">📋 Permessi L.104</span>
                       <span className="font-black text-slate-900">{remain104} <span className="text-slate-400 font-bold">su {p104Tot}</span></span>
                    </div>
                    <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                       <div className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full transition-all" style={{ width: `${Math.min(100, (used104 / p104Tot) * 100)}%` }}></div>
                    </div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wide">Consumate: {used104} giornate</p>
                 </div>

                 {/* Festività Soppresse */}
                 <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                       <span className="font-bold text-slate-700">🎄 Festività Soppresse</span>
                       <span className="font-black text-slate-900">{festTot - usedFestivita} <span className="text-slate-400 font-bold">su {festTot}</span></span>
                    </div>
                    <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                       <div className="h-full bg-gradient-to-r from-rose-400 to-rose-500 rounded-full transition-all" style={{ width: `${Math.min(100, (usedFestivita / festTot) * 100)}%` }}></div>
                    </div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wide">Consumate: {usedFestivita} giornate</p>
                 </div>
               </div>
            </div>
         </div>

         {/* Storico Richieste */}
         <div className="lg:col-span-2">
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
               <div className="p-6 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-center gap-4">
                     <div className="bg-emerald-50 text-emerald-600 p-3 rounded-2xl">
                        <CalendarDays size={24} />
                     </div>
                     <div>
                        <h2 className="text-xl font-black text-slate-800">Storico Richieste</h2>
                        <p className="text-xs text-slate-500 font-medium">{agentRequests.length} richieste totali</p>
                     </div>
                  </div>
               </div>
               <div className="p-6">
                  {agentRequests.length === 0 ? (
                     <div className="text-center py-10">
                        <p className="text-slate-400 font-medium">Nessuna richiesta insoluta o passata.</p>
                     </div>
                  ) : (
                     <div className="space-y-3">
                        {agentRequests.map((req: any) => {
                           const isPending = req.status === "PENDING"
                           const isApp = req.status === "APPROVED"
                           return (
                              <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors gap-4">
                                 <div>
                                    <div className="flex gap-2 items-center mb-1">
                                       <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-widest rounded ${isPending ? 'bg-amber-100 text-amber-700' : isApp ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                          {req.status}
                                       </span>
                                       <span className="text-sm font-bold text-slate-800">{req.code}</span>
                                    </div>
                                    <p className="text-xs text-slate-500 font-medium">{new Date(req.date).toLocaleDateString("it-IT")} {req.endDate && `- ${new Date(req.endDate).toLocaleDateString("it-IT")}`}</p>
                                    {req.notes && <p className="text-xs text-slate-400 mt-2 bg-slate-100 p-2 rounded-lg italic">&quot;{req.notes}&quot;</p>}
                                 </div>
                                 <div className="text-right shrink-0">
                                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Inoltrata il</p>
                                    <p className="text-sm font-bold text-slate-600">{new Date(req.createdAt).toLocaleDateString("it-IT")}</p>
                                 </div>
                              </div>
                           )
                        })}
                     </div>
                  )}
               </div>
            </div>
         </div>
      </div>
    </div>
  )
}
