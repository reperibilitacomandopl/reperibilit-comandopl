// @ts-nocheck
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit"

// GET: Retrieve current settings + all agents with massimale + PEC config
export async function GET() {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && !session?.user?.canConfigureSystem) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const tenantId = session.user.tenantId
    const tf = tenantId ? { tenantId } : {}

    let settings = await prisma.globalSettings.findFirst({ where: { ...tf } })
    if (!settings) {
      settings = await prisma.globalSettings.create({
        data: { tenantId, minUfficiali: 1, usaProporzionale: true, annoCorrente: 2026, meseCorrente: 4, massimaleAgente: 5, massimaleUfficiale: 6, distaccoMinimo: 2, permettiConsecutivi: false }
      })
    }

    const agents = await prisma.user.findMany({
      where: { role: "AGENTE", ...tf },
      orderBy: { name: "asc" },
    })

    const agentsMapped = agents.map((a: any) => ({
      id: a.id, name: a.name, matricola: a.matricola, isUfficiale: a.isUfficiale,
      massimale: a.massimale, email: a.email || null, phone: a.phone || null,
    }))

    // Read PEC credentials from DB
    let pecRow = await prisma.pecSettings.findFirst({ where: { ...tf } })
    if (!pecRow) {
      pecRow = await prisma.pecSettings.create({ data: { tenantId } })
    }
    const pecConfig = {
      host: pecRow.host,
      port: pecRow.port,
      user: pecRow.user,
      pass: pecRow.pass ? "••••••••" : "",
      from: pecRow.fromAddr,
    }

    return NextResponse.json({ settings, agents: agentsMapped, pecConfig })
  } catch (error) {
    console.error("[SETTINGS GET]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}

// PUT: Update settings and/or agent massimale
export async function PUT(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && !session?.user?.canConfigureSystem) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { action } = body

    if (action === "updateSettings") {
      const { minUfficiali, usaProporzionale, meseCorrente, annoCorrente } = body
      const updated = await prisma.globalSettings.upsert({
        where: { tenantId: tenantId || "" },
        update: { 
          minUfficiali: minUfficiali ?? undefined, 
          usaProporzionale: usaProporzionale ?? undefined,
          meseCorrente: meseCorrente ?? undefined,
          annoCorrente: annoCorrente ?? undefined,
          massimaleAgente: body.massimaleAgente ?? undefined,
          massimaleUfficiale: body.massimaleUfficiale ?? undefined,
          distaccoMinimo: body.distaccoMinimo ?? undefined,
          permettiConsecutivi: body.permettiConsecutivi ?? undefined
        },
        create: { 
          tenantId: tenantId || null,
          minUfficiali: minUfficiali ?? 1, 
          usaProporzionale: usaProporzionale ?? true, 
          annoCorrente: annoCorrente ?? new Date().getFullYear(), 
          meseCorrente: meseCorrente ?? new Date().getMonth() + 1,
          massimaleAgente: body.massimaleAgente ?? 5,
          massimaleUfficiale: body.massimaleUfficiale ?? 6,
          distaccoMinimo: body.distaccoMinimo ?? 2,
          permettiConsecutivi: body.permettiConsecutivi ?? false
        }
      })

      await logAudit({
        tenantId: session.user.tenantId,
        adminId: session.user.id!,
        adminName: session.user.name!,
        action: "UPDATE_SETTINGS",
        details: `Aggiornate impostazioni globali (Min Uff: ${minUfficiali}, Prop: ${usaProporzionale}, Mese: ${meseCorrente}/${annoCorrente})`
      })

      return NextResponse.json({ success: true })
    }

    if (action === "updateMassimale") {
      const { userId, massimale } = body
      if (!userId || massimale == null) return NextResponse.json({ error: "Missing data" }, { status: 400 })
      const user = await prisma.user.update({ 
        where: { id: userId, tenantId: tenantId || null }, 
        data: { massimale: parseInt(massimale, 10) } 
      })

      await logAudit({
        tenantId: session.user.tenantId,
        adminId: session.user.id!,
        adminName: session.user.name!,
        action: "UPDATE_MASSIMALE",
        targetId: userId,
        targetName: user.name,
        details: `Aggiornato massimale a ${massimale} per ${user.name}`
      })

      return NextResponse.json({ success: true })
    }

    if (action === "addAgent") {
      const { matricola, name, password, isUfficiale } = body
      if (!matricola || !name || !password) return NextResponse.json({ error: "matricola, name, password required" }, { status: 400 })
      const existing = await prisma.user.findUnique({ where: { matricola } })
      if (existing) return NextResponse.json({ error: "Matricola già esistente" }, { status: 409 })
      const bcrypt = require("bcryptjs")
      const hashed = await bcrypt.hash(password, 10)
      const newUser = await prisma.user.create({ data: { tenantId: session.user.tenantId || null, matricola, name, password: hashed, role: "AGENTE", isUfficiale: isUfficiale || false, massimale: 8, qualifica: "Agente di P.L.", gradoLivello: 13 } })

      await logAudit({
        tenantId: session.user.tenantId,
        adminId: session.user.id!,
        adminName: session.user.name!,
        action: "ADD_AGENT",
        targetId: newUser.id,
        targetName: newUser.name,
        details: `Aggiunto nuovo agente: ${newUser.name} (Matr. ${newUser.matricola})`
      })

      return NextResponse.json({ success: true, userId: newUser.id })
    }

    if (action === "deleteAgent") {
      const { userId } = body
      if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })
      const user = await prisma.user.findFirst({ 
        where: { id: userId, tenantId: tenantId || null } 
      })
      if (!user) return NextResponse.json({ error: "Utente non trovato o non appartenente al tuo comando" }, { status: 404 })
      if (user.role === "ADMIN") return NextResponse.json({ error: "Non puoi eliminare un admin" }, { status: 403 })
      
      await prisma.user.delete({ 
        where: { id: userId, tenantId: tenantId || null } 
      })

      await logAudit({
        tenantId: session.user.tenantId,
        adminId: session.user.id!,
        adminName: session.user.name!,
        action: "DELETE_AGENT",
        targetId: userId,
        targetName: user.name,
        details: `Eliminato agente: ${user.name} (Matr. ${user.matricola})`
      })

      return NextResponse.json({ success: true })
    }

    if (action === "savePec") {
      const { host, port, user, pass, from } = body
      const dataToUpdate: Record<string, string> = {
        host: host || "",
        port: port || "465",
        user: user || "",
        fromAddr: from || "",
      }
      if (pass && pass !== "••••••••") {
        dataToUpdate.pass = pass
      }
      await prisma.pecSettings.upsert({
        where: { tenantId: tenantId || "" },
        update: dataToUpdate,
        create: { tenantId: tenantId || null, ...dataToUpdate },
      })

      await logAudit({
        tenantId: session.user.tenantId,
        adminId: session.user.id!,
        adminName: session.user.name!,
        action: "UPDATE_PEC",
        details: `Aggiornate impostazioni PEC (Host: ${host}, User: ${user})`
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (error) {
    console.error("[SETTINGS PUT]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
