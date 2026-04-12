import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

// POST /api/admin/import-agents — Import massivo agenti da CSV/Excel
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const tenantId = session.user.tenantId
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant non trovato" }, { status: 400 })
    }

    const { agents, duplicateMode = "skip" } = await request.json()

    if (!Array.isArray(agents) || agents.length === 0) {
      return NextResponse.json({ error: "Nessun agente da importare" }, { status: 400 })
    }

    if (agents.length > 200) {
      return NextResponse.json({ error: "Massimo 200 agenti per importazione" }, { status: 400 })
    }

    // Check tenant agent limit
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { maxAgents: true }
    })

    const currentCount = await prisma.user.count({ where: { tenantId } })

    let created = 0
    let skipped = 0
    const errors: string[] = []

    // Default password for all new agents
    const defaultPassword = await bcrypt.hash("password123", 10)

    for (const agent of agents) {
      try {
        if (!agent.name || !agent.matricola) {
          errors.push(`Agente senza nome o matricola saltato`)
          skipped++
          continue
        }

        // Check if matricola already exists in this tenant
        const existing = await prisma.user.findFirst({
          where: { matricola: agent.matricola, tenantId }
        })

        if (existing) {
          if (duplicateMode === "overwrite") {
            // Update existing agent
            await prisma.user.update({
              where: { id: existing.id },
              data: {
                name: agent.name.toUpperCase(),
                qualifica: agent.qualifica || existing.qualifica,
                email: agent.email || existing.email,
                phone: agent.phone || existing.phone,
                squadra: agent.squadra || existing.squadra,
                isUfficiale: agent.isUfficiale ?? existing.isUfficiale,
              }
            })
            created++ // count as "processed"
          } else {
            skipped++
          }
          continue
        }

        // Check tenant limit
        if (tenant && (currentCount + created) >= tenant.maxAgents) {
          errors.push(`Limite agenti raggiunto (${tenant.maxAgents}). Resta: ${agent.name}`)
          skipped++
          continue
        }

        // Create new agent
        await prisma.user.create({
          data: {
            tenantId,
            name: agent.name.toUpperCase(),
            matricola: agent.matricola,
            password: defaultPassword,
            role: agent.isUfficiale ? "ADMIN" : "AGENTE",
            qualifica: agent.qualifica || "Agente di P.L.",
            email: agent.email || null,
            phone: agent.phone || null,
            squadra: agent.squadra || null,
            isUfficiale: agent.isUfficiale || false,
            forcePasswordChange: true,
          }
        })
        created++
      } catch (e: any) {
        errors.push(`Errore per "${agent.name}": ${e.message?.substring(0, 80)}`)
        skipped++
      }
    }

    // Audit Log
    await prisma.auditLog.create({
      data: {
        tenantId,
        adminId: session.user.id,
        adminName: session.user.name || "Admin",
        action: "IMPORT_AGENTS",
        details: `Importati ${created} agenti (${skipped} saltati) da file CSV/Excel`,
      }
    })

    return NextResponse.json({ created, skipped, errors })
  } catch (e: any) {
    console.error("Import agents error:", e)
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 })
  }
}
