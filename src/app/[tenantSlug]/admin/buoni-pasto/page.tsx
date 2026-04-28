import { auth } from "@/auth"
import { redirect } from "next/navigation"
import MealVoucherPanel from "@/components/MealVoucherPanel"

export const dynamic = "force-dynamic"

export default async function BuoniPastoPage() {
  const session = await auth()
  if (!session?.user || (session.user.role !== "ADMIN" && !session.user.canManageShifts)) {
    redirect("/login")
  }

  return (
    <div className="p-6 lg:p-8 relative z-10">
      <div className="mb-10 animate-in slide-in-from-left duration-700">
          <div className="flex items-center gap-3 mb-2">
             <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                <span className="font-black text-xs">BP</span>
             </div>
             <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Sentinel Operational Module</span>
          </div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">Modulo <span className="text-emerald-600">Buoni Pasto</span></h1>
      </div>
      
      <MealVoucherPanel />
    </div>
  )
}
