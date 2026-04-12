import { auth, signOut } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import AdminSidebar from "@/components/AdminSidebar"
import NotificationHub from "@/components/NotificationHub"
import TrialBanner from "@/components/TrialBanner"

export const dynamic = "force-dynamic"

export default async function AdminLayout({ 
  children,
  params
}: { 
  children: React.ReactNode,
  params: Promise<{ tenantSlug: string }>
}) {
  const { tenantSlug } = await params
  const session = await auth()
  if (!session?.user) redirect("/login")

  const hasAdminAccess = 
    session.user.role === "ADMIN" || 
    session.user.canManageShifts || 
    session.user.canManageUsers || 
    session.user.canVerifyClockIns || 
    session.user.canConfigureSystem

  if (!hasAdminAccess) redirect("/login")

  const { name, matricola } = session.user

  // Fetch tenant trial info
  const tenant = session.user.tenantId ? await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { trialEndsAt: true, planType: true }
  }) : null

  return (
    <div className="h-screen flex overflow-hidden bg-slate-950">
      {/* Sidebar */}
      <AdminSidebar
        userName={name || "Admin"}
        userMatricola={matricola || ""}
        tenantName={session.user.tenantName}
        tenantSlug={tenantSlug}
        isSuperAdmin={session.user.isSuperAdmin}
        currentTenantId={session.user.tenantId}
        signOutAction={async () => {
          "use server"
          await signOut()
        }}
        canManageShifts={session.user.canManageShifts}
        canManageUsers={session.user.canManageUsers}
        canVerifyClockIns={session.user.canVerifyClockIns}
        canConfigureSystem={session.user.canConfigureSystem}
        userRole={session.user.role}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-slate-950 relative custom-scrollbar">
        {/* Trial Banner */}
        <TrialBanner trialEndsAt={tenant?.trialEndsAt?.toISOString() || null} planType={tenant?.planType || "ACTIVE"} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent pointer-events-none"></div>
        
        {/* TOP HEADER */}
        <header className="sticky top-0 z-40 w-full bg-slate-950/80 backdrop-blur-xl border-b border-white/5 px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-8 w-[2px] bg-indigo-500 rounded-full hidden lg:block"></div>
            <h2 className="text-white text-xs font-black uppercase tracking-[0.2em] opacity-80">
              Admin Dashboard <span className="text-slate-500 mx-2">/</span> <span className="text-indigo-400 capitalize">{tenantSlug}</span>
            </h2>
          </div>
          
          <div className="flex items-center gap-6">
            <NotificationHub userRole={session.user.role} />
          </div>
        </header>

        <div className="relative z-10">
          {children}
        </div>
      </main>
    </div>
  )
}
