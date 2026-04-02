import { auth, signOut } from "@/auth"
import { redirect } from "next/navigation"
import AdminSidebar from "@/components/AdminSidebar"

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
        signOutAction={async () => {
          "use server"
          await signOut()
        }}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-slate-100 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-200/50 via-transparent to-transparent pointer-events-none"></div>
        {children}
      </main>
    </div>
  )
}
