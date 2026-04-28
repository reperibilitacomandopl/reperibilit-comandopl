import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

// GET: Lista tutti i tenant (solo SuperAdmin)
export async function GET() {
  const session = await auth()
  if (!session?.user?.isSuperAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tenants = await prisma.tenant.findMany({
    include: {
      _count: {
        select: { users: true, shifts: true, vehicles: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return NextResponse.json(tenants)
}

// POST: Crea un nuovo tenant con il suo admin
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.isSuperAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { name, slug, address, partitaIva, planType, maxAgents, adminName, adminMatricola, adminPassword, logoUrl, primaryColor } = await req.json()

    if (!name || !slug || !adminName || !adminMatricola || !adminPassword) {
      return NextResponse.json({ error: "Campi obbligatori mancanti" }, { status: 400 })
    }

    // Verifica slug unico
    const existing = await prisma.tenant.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json({ error: `Lo slug "${slug}" è già in uso` }, { status: 400 })
    }

    // Verifica matricola unica
    const existingUser = await prisma.user.findFirst({ where: { matricola: adminMatricola } })
    if (existingUser) {
      return NextResponse.json({ error: `La matricola "${adminMatricola}" è già in uso` }, { status: 400 })
    }

    // Crea tenant + admin in una transazione
    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Crea il Tenant
      const tenant = await tx.tenant.create({
        data: {
          name,
          slug,
          address: address || null,
          partitaIva: partitaIva || null,
          planType: planType || "TRIAL",
          maxAgents: maxAgents || 50,
          logoUrl: logoUrl || null,
          primaryColor: primaryColor || "#4f46e5",
          isActive: true,
          trialEndsAt: planType === "TRIAL" ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) : null
        }
      })

      // 2. Crea l'utente Admin per quel tenant
      const hashedPassword = await bcrypt.hash(adminPassword, 10)
      const admin = await tx.user.create({
        data: {
          tenantId: tenant.id,
          name: adminName,
          matricola: adminMatricola,
          password: hashedPassword,
          role: "ADMIN",
          isUfficiale: true,
          forcePasswordChange: true
        }
      })

      // 3. Crea le impostazioni globali per il tenant
      await tx.globalSettings.create({
        data: {
          tenantId: tenant.id,
          minUfficiali: 1,
          massimaleAgente: 5,
          massimaleUfficiale: 6,
          annoCorrente: new Date().getFullYear(),
          meseCorrente: new Date().getMonth() + 1
        }
      })

      return { tenant, admin }
    })

    return NextResponse.json({
      success: true,
      tenant: { id: result.tenant.id, name: result.tenant.name, slug: result.tenant.slug },
      admin: { id: result.admin.id, name: result.admin.name, matricola: result.admin.matricola }
    })

  } catch (error) {
    console.error("[CREATE TENANT ERROR]", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}

// PUT: Attiva/Disattiva un tenant
export async function PUT(req: Request) {
  const session = await auth()
  if (!session?.user?.isSuperAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { tenantId, isActive } = await req.json()

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { isActive }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[TOGGLE TENANT ERROR]", error)
    return NextResponse.json({ error: "Errore" }, { status: 500 })
  }
}

// PATCH: Aggiorna i dati di un tenant
export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.isSuperAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { tenantId, name, planType, maxAgents, address, partitaIva, logoUrl, primaryColor } = await req.json()

    if (!tenantId) {
      return NextResponse.json({ error: "ID Tenant mancante" }, { status: 400 })
    }

    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        name,
        planType,
        maxAgents,
        address,
        partitaIva,
        logoUrl,
        primaryColor,
        trialEndsAt: planType === "TRIAL" ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) : undefined
      }
    })

    return NextResponse.json({ success: true, tenant: updated })
  } catch (error) {
    console.error("[UPDATE TENANT ERROR]", error)
    return NextResponse.json({ error: "Errore durante l'aggiornamento" }, { status: 500 })
  }
}
