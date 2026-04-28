import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Endpoint per Vercel Cron. Chiamata quotidiana.
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const now = new Date()

    console.log(`[CRON] Avviato controllo scadenze Trial. Data attuale: ${now.toISOString()}`)

    // Trova i tenant TRIAL ancora attivi con data di fine trial passata
    const expiredTenants = await prisma.tenant.findMany({
      where: {
        planType: "TRIAL",
        isActive: true,
        trialEndsAt: {
          lt: now
        }
      },
      select: {
        id: true,
        name: true,
        slug: true
      }
    })

    if (expiredTenants.length === 0) {
      return NextResponse.json({ success: true, message: "Nessun tenant da sospendere.", count: 0 })
    }

    // Disattiva i tenant scaduti
    const expiredIds = expiredTenants.map((t: any) => t.id)
    
    await prisma.tenant.updateMany({
      where: {
        id: { in: expiredIds }
      },
      data: {
        isActive: false
      }
    })

    console.log(`[CRON] Sospesi ${expiredTenants.length} tenant per fine periodo di prova:`, expiredTenants.map((t: any) => t.name).join(", "))

    // (Opzionale) Potremmo creare una notifica per il superadmin o mandare una mail

    return NextResponse.json({ 
      success: true, 
      message: "Trial Check Completed", 
      suspendedCount: expiredTenants.length,
      suspendedTenants: expiredTenants
    })
  } catch (error) {
    console.error("[CRON] Errore Tenant Check:", error)
    return NextResponse.json({ error: "Errore interno durante il controllo scadenze" }, { status: 500 })
  }
}
