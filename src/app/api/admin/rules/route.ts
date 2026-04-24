import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id || !session.user.tenantId) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    // Verify admin access
    const u = session.user;
    if (!u.isSuperAdmin && u.role !== "ADMIN" && !u.canConfigureSystem && !u.canManageShifts) {
      return NextResponse.json({ error: "Accesso negato" }, { status: 403 })
    }

    const rules = await prisma.shiftRule.findMany({
      where: { tenantId: session.user.tenantId },
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json(rules)
  } catch (error) {
    console.error("GET /api/admin/rules error:", error)
    return NextResponse.json({ error: "Errore interno server" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id || !session.user.tenantId) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const u = session.user;
    if (!u.isSuperAdmin && u.role !== "ADMIN" && !u.canConfigureSystem) {
      return NextResponse.json({ error: "Accesso negato. Solo gli amministratori di sistema possono creare regole." }, { status: 403 })
    }

    const body = await req.json()
    const { name, type, targetRole, config, isActive } = body

    if (!name || !type || !config) {
      return NextResponse.json({ error: "Dati mancanti" }, { status: 400 })
    }

    const rule = await prisma.shiftRule.create({
      data: {
        tenantId: session.user.tenantId,
        name,
        type,
        targetRole: targetRole || "ALL",
        config: typeof config === 'string' ? config : JSON.stringify(config),
        isActive: isActive !== undefined ? isActive : true
      }
    })

    return NextResponse.json(rule)
  } catch (error) {
    console.error("POST /api/admin/rules error:", error)
    return NextResponse.json({ error: "Errore interno server" }, { status: 500 })
  }
}
