import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
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

    // Fetch all related data for the tenant
    const [
      tenant,
      users,
      shifts,
      settings,
      clockRecords,
      vehicles,
      swapRequests,
      leaveRequests,
      notifications,
      auditLogs,
      emergencyAlerts
    ] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: tenantId } }),
      prisma.user.findMany({ where: { tenantId } }),
      prisma.shift.findMany({ where: { tenantId } }),
      prisma.globalSettings.findFirst({ where: { tenantId } }),
      prisma.clockRecord.findMany({ where: { tenantId } }),
      prisma.vehicle.findMany({ where: { tenantId } }),
      prisma.shiftSwapRequest.findMany({ where: { tenantId } }),
      prisma.agentRequest.findMany({ where: { tenantId } }),
      prisma.notification.findMany({ where: { tenantId } }),
      prisma.auditLog.findMany({ where: { tenantId } }),
      prisma.emergencyAlert.findMany({ where: { tenantId } })
    ])

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 })
    }

    const exportData = {
      exportedAt: new Date().toISOString(),
      tenant,
      settings,
      users,
      shifts,
      clockRecords,
      vehicles,
      swapRequests,
      leaveRequests,
      notifications,
      auditLogs,
      emergencyAlerts
    }

    // Set appropriate headers for file download
    const headers = new Headers()
    headers.set("Content-Type", "application/json")
    headers.set("Content-Disposition", `attachment; filename="export_tenant_${tenant.slug}_${new Date().toISOString().split('T')[0]}.json"`)

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers
    })

  } catch (error) {
    console.error("[EXPORT TENANT ERROR]", error)
    return NextResponse.json({ error: "Errore durante l'esportazione" }, { status: 500 })
  }
}
