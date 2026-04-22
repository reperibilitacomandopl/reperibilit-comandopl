import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user?.isSuperAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get("tenantId")

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID required" }, { status: 400 })
    }

    // Per sicurezza, verifichiamo che il tenant esista
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
    if (!tenant) {
      return NextResponse.json({ error: "Tenant non trovato" }, { status: 404 })
    }

    // Eseguiamo la cancellazione a cascata tramite transazione per sicurezza,
    // anche se onDelete: Cascade su Prisma gestirebbe molto, è meglio essere espliciti
    // per tabelle dove onDelete non è specificato nel modello.
    
    await prisma.$transaction(async (tx) => {
      // 1. Log, Notifiche e Timbrature
      await tx.auditLog.deleteMany({ where: { tenantId } })
      await tx.notification.deleteMany({ where: { tenantId } })
      await tx.clockRecord.deleteMany({ where: { tenantId } })
      await tx.emergencyAlert.deleteMany({ where: { tenantId } })

      // 2. Richieste e Scambi
      await tx.shiftSwapRequest.deleteMany({ where: { tenantId } })
      await tx.agentRequest.deleteMany({ where: { tenantId } })

      // 3. Turni e Veicoli
      await tx.shift.deleteMany({ where: { tenantId } })
      await tx.vehicle.deleteMany({ where: { tenantId } })

      // 4. Utenti e Impostazioni
      await tx.user.deleteMany({ where: { tenantId } })
      await tx.globalSettings.deleteMany({ where: { tenantId } })

      // 5. Infine, il Tenant stesso
      await tx.tenant.delete({ where: { id: tenantId } })
    })

    console.log(`[GDPR DESTROY] Tenant ${tenant.name} (${tenantId}) eliminato definitivamente.`)

    return NextResponse.json({ success: true, message: "Tenant eliminato definitivamente" })

  } catch (error) {
    console.error("[DESTROY TENANT ERROR]", error)
    return NextResponse.json({ error: "Errore durante l'eliminazione" }, { status: 500 })
  }
}
