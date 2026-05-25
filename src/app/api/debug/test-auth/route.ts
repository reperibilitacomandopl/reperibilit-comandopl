import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { blockInProduction } from "@/lib/dev-only"

export async function GET(request: Request) {
  const blocked = blockInProduction()
  if (blocked) return blocked

  const { searchParams } = new URL(request.url)
  const slug = searchParams.get("slug") || "comando-test"
  const matricola = searchParams.get("matricola") || "CMD001"
  const password = searchParams.get("password") || "password123"

  try {
    const tenant = await prisma.tenant.findUnique({ where: { slug } })
    if (!tenant) return NextResponse.json({ step: "tenant", error: "Tenant non trovato", slug })

    const user = await prisma.user.findFirst({
      where: { matricola, tenantId: tenant.id }
    })
    if (!user) return NextResponse.json({ step: "user", error: "Utente non trovato", matricola, tenantId: tenant.id, slug })

    const valid = await bcrypt.compare(password, user.password)
    return NextResponse.json({
      step: "ok",
      valid,
      user: { name: user.name, matricola: user.matricola, role: user.role, isActive: user.isActive, forcePasswordChange: user.forcePasswordChange },
      tenant: { name: tenant.name, slug: tenant.slug, isActive: tenant.isActive }
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
