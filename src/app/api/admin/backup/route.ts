import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accesso Non Autorizzato" }, { status: 401 })
  }

  try {
    const tenantId = session.user.tenantId
    if (!tenantId) {
      return NextResponse.json({ error: "TenantId mancante" }, { status: 400 })
    }

    // Estraiamo tutti i dati del Tenant per un backup logico in formato JSON
    const [
      users,
      shifts,
      clockRecords,
      agentRequests,
      agentBalances,
      agendaEntries,
      certifiedDocuments,
      monthStatuses,
      schools,
      vehicles,
      weapons,
      radios,
      globalSettings
    ] = await Promise.all([
      prisma.user.findMany({ where: { tenantId } }),
      prisma.shift.findMany({ where: { tenantId } }),
      prisma.clockRecord.findMany({ where: { tenantId } }),
      prisma.agentRequest.findMany({ where: { tenantId } }),
      prisma.agentBalance.findMany({ where: { tenantId } }),
      prisma.agendaEntry.findMany({ where: { tenantId } }),
      prisma.certifiedDocument.findMany({ where: { tenantId } }),
      prisma.monthStatus.findMany({ where: { tenantId } }),
      prisma.school.findMany({ where: { tenantId } }),
      prisma.vehicle.findMany({ where: { tenantId } }),
      prisma.weapon.findMany({ where: { tenantId } }),
      prisma.radio.findMany({ where: { tenantId } }),
      prisma.globalSettings.findFirst({ where: { tenantId } })
    ])

    const backupData = {
      metadata: {
        timestamp: new Date().toISOString(),
        version: "1.0",
        tenantId
      },
      data: {
        globalSettings,
        users,
        shifts,
        clockRecords,
        agentRequests,
        agentBalances,
        agendaEntries,
        certifiedDocuments,
        monthStatuses,
        schools,
        vehicles,
        weapons,
        radios
      }
    }

    const jsonString = JSON.stringify(backupData, null, 2)

    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="backup_sentinel_${new Date().toISOString().split('T')[0]}.json"`,
      }
    })

  } catch (error) {
    console.error("[BACKUP_ERROR]", error)
    return NextResponse.json({ error: "Errore durante la generazione del backup" }, { status: 500 })
  }
}
