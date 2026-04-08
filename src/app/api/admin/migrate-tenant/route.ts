import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET: Mostra una pagina con bottone per eseguire la migrazione
export async function GET() {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && !session?.user?.canConfigureSystem) {
    return new Response("Non autorizzato. Effettua il login come Admin.", { status: 401 })
  }

  const html = `<!DOCTYPE html>
<html lang="it">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Migrazione Multi-Tenant</title>
<style>
  body{font-family:system-ui;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
  .card{background:#1e293b;border-radius:1.5rem;padding:3rem;max-width:500px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.5)}
  h1{font-size:1.5rem;margin-bottom:.5rem} p{color:#94a3b8;font-size:.9rem;line-height:1.6}
  button{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;padding:1rem 2.5rem;border-radius:1rem;font-size:1rem;font-weight:800;cursor:pointer;margin-top:1.5rem;transition:transform .2s}
  button:hover{transform:scale(1.05)} button:disabled{opacity:.5;cursor:not-allowed;transform:none}
  #result{margin-top:1.5rem;text-align:left;background:#0f172a;border-radius:1rem;padding:1rem;font-size:.8rem;display:none;max-height:300px;overflow:auto;white-space:pre-wrap}
  .ok{color:#34d399} .err{color:#f87171}
</style></head>
<body>
<div class="card">
  <h1>🏢 Migrazione Multi-Tenant</h1>
  <p>Questo script creerà il Tenant <b>"Comando P.L. Altamura"</b> e collegherà <u>tutti i dati esistenti</u> (utenti, turni, impostazioni) a questo Tenant.<br><br>⚠️ L'operazione è sicura e idempotente (puoi eseguirla più volte senza problemi).</p>
  <button id="btn" onclick="runMigration()">🚀 Esegui Migrazione</button>
  <div id="result"></div>
</div>
<script>
async function runMigration(){
  const btn=document.getElementById('btn'), res=document.getElementById('result');
  btn.disabled=true; btn.textContent='⏳ Migrazione in corso...';
  res.style.display='block'; res.className=''; res.textContent='Elaborazione...';
  try{
    const r=await fetch('/api/admin/migrate-tenant',{method:'POST'});
    const d=await r.json();
    if(r.ok){res.className='ok';res.textContent=JSON.stringify(d,null,2);btn.textContent='✅ Completata!';}
    else{res.className='err';res.textContent='ERRORE: '+JSON.stringify(d,null,2);btn.textContent='❌ Errore';btn.disabled=false;}
  }catch(e){res.className='err';res.textContent='Errore di rete: '+e.message;btn.textContent='❌ Errore';btn.disabled=false;}
}
</script>
</body></html>`;

  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } })
}

// POST: Esegue la migrazione Multi-Tenant
// Crea il Tenant "Altamura" e assegna TUTTI i dati esistenti a quel tenant
export async function POST(req: Request) {
  const session = await auth()
  
  // Solo ADMIN o SUPER_ADMIN possono eseguire la migrazione
  if (session?.user?.role !== "ADMIN" && !session?.user?.canConfigureSystem) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // 1. Crea (o trova) il Tenant principale "Altamura"
    let tenant = await prisma.tenant.findUnique({
      where: { slug: "altamura" }
    })

    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          name: "Comando P.L. Altamura",
          slug: "altamura",
          address: "Altamura (BA)",
          planType: "PRO",
          isActive: true,
          maxAgents: 200
        }
      })
    }

    const tenantId = tenant.id
    const results: Record<string, number> = {}

    // 2. Assegna tutti gli User senza tenantId
    const usersUpdated = await prisma.user.updateMany({
      where: { tenantId: null },
      data: { tenantId }
    })
    results.users = usersUpdated.count

    // 3. Assegna tutti gli Shift senza tenantId
    const shiftsUpdated = await prisma.shift.updateMany({
      where: { tenantId: null },
      data: { tenantId }
    })
    results.shifts = shiftsUpdated.count

    // 4. Assegna tutte le Absence
    const absencesUpdated = await prisma.absence.updateMany({
      where: { tenantId: null },
      data: { tenantId }
    })
    results.absences = absencesUpdated.count

    // 5. Assegna RotationGroup
    const rotGroupsUpdated = await prisma.rotationGroup.updateMany({
      where: { tenantId: null },
      data: { tenantId }
    })
    results.rotationGroups = rotGroupsUpdated.count

    // 6. Assegna ServiceCategory
    const catUpdated = await prisma.serviceCategory.updateMany({
      where: { tenantId: null },
      data: { tenantId }
    })
    results.serviceCategories = catUpdated.count

    // 7. Assegna Vehicle
    const vehUpdated = await prisma.vehicle.updateMany({
      where: { tenantId: null },
      data: { tenantId }
    })
    results.vehicles = vehUpdated.count

    // 8. Assegna PatrolTemplate
    const patrolUpdated = await prisma.patrolTemplate.updateMany({
      where: { tenantId: null },
      data: { tenantId }
    })
    results.patrolTemplates = patrolUpdated.count

    // 9. Assegna GlobalSettings
    const settingsUpdated = await prisma.globalSettings.updateMany({
      where: { tenantId: null },
      data: { tenantId }
    })
    results.globalSettings = settingsUpdated.count

    // 10. Assegna MonthStatus
    const monthUpdated = await prisma.monthStatus.updateMany({
      where: { tenantId: null },
      data: { tenantId }
    })
    results.monthStatuses = monthUpdated.count

    // 11. Assegna AgendaEntry
    const agendaUpdated = await prisma.agendaEntry.updateMany({
      where: { tenantId: null },
      data: { tenantId }
    })
    results.agendaEntries = agendaUpdated.count

    // 12. Assegna AuditLog
    const auditUpdated = await prisma.auditLog.updateMany({
      where: { tenantId: null },
      data: { tenantId }
    })
    results.auditLogs = auditUpdated.count

    // 13. Assegna EmergencyAlert
    const alertUpdated = await prisma.emergencyAlert.updateMany({
      where: { tenantId: null },
      data: { tenantId }
    })
    results.emergencyAlerts = alertUpdated.count

    // 14. Assegna ShiftSwapRequest
    const swapUpdated = await prisma.shiftSwapRequest.updateMany({
      where: { tenantId: null },
      data: { tenantId }
    })
    results.shiftSwapRequests = swapUpdated.count

    // 15. Assegna AgentRequest
    const reqUpdated = await prisma.agentRequest.updateMany({
      where: { tenantId: null },
      data: { tenantId }
    })
    results.agentRequests = reqUpdated.count

    // 16. Assegna PecSettings
    const pecUpdated = await prisma.pecSettings.updateMany({
      where: { tenantId: null },
      data: { tenantId }
    })
    results.pecSettings = pecUpdated.count

    // 17. Assegna AgentBalance
    const balUpdated = await prisma.agentBalance.updateMany({
      where: { tenantId: null },
      data: { tenantId }
    })
    results.agentBalances = balUpdated.count

    // 18. Marca l'utente Admin come SuperAdmin (il primo admin diventa il fondatore)
    const adminUser = await prisma.user.findFirst({
      where: { role: "ADMIN", tenantId }
    })
    if (adminUser) {
      await prisma.user.update({
        where: { id: adminUser.id },
        data: { isSuperAdmin: true }
      })
      results.superAdminSet = 1
    }

    return NextResponse.json({
      success: true,
      tenantId,
      tenantName: tenant.name,
      migratedRecords: results,
      message: `Migrazione completata! Tutti i dati sono ora sotto il Tenant "${tenant.name}".`
    })

  } catch (error) {
    console.error("[MIGRATION ERROR]", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
