import { auth, signOut } from "@/auth"
import { redirect } from "next/navigation"
import AdminSidebar from "@/components/AdminSidebar"
import NotificationHub from "@/components/NotificationHub"

export const dynamic = "force-dynamic"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session?.user) redirect("/login")
  if (session.user.forcePasswordChange) redirect("/change-password")
  if (session.user.role !== "ADMIN") redirect("/login")

  const { name, matricola } = session.user

  return (
    <div className="h-screen flex overflow-hidden bg-slate-950">
      {/* Sidebar */}
      <AdminSidebar
        userName={name || "Admin"}
        userMatricola={matricola || ""}
        tenantName={session.user.tenantName}
        isSuperAdmin={session.user.isSuperAdmin}
        currentTenantId={session.user.tenantId}
        signOutAction={async () => {
          "use server"
          await signOut()
        }}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-slate-950 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent pointer-events-none"></div>
        
        {/* Top Header Floating for Notifications */}
        <div className="sticky top-0 right-0 z-40 flex justify-end p-4 pointer-events-none">
          <div className="pointer-events-auto bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-2xl p-1 shadow-2xl">
            <NotificationHub />
          </div>
        </div>

        <div className="relative z-10">
          {children}
        </div>
      </main>
    </div>
  )
}
