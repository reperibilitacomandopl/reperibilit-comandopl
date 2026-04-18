import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { cookies } from "next/headers"

// GET/POST: Switch impersonation
export async function POST(req: Request) {
  const session = await auth()
  
  // Verifica che l'utente sia un SuperAdmin (basandoci sul campo DB originale per sicurezza)
  const dbUser = await prisma.user.findUnique({
    where: { id: session?.user?.id }
  })
  
  if (!dbUser?.isSuperAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { tenantId } = await req.json()
    
    const cookieStore = await cookies()
    if (tenantId) {
      cookieStore.set("superadmin_impersonate", tenantId, { path: "/", secure: true, maxAge: 86400 })
    } else {
      cookieStore.delete("superadmin_impersonate")
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Errore durante l'impersonificazione" }, { status: 500 })
  }
}
