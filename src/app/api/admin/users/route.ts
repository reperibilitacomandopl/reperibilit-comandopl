import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { logAudit } from "@/lib/audit"

export async function GET(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const users = await prisma.user.findMany({
      where: { role: "AGENTE" },
      orderBy: { name: "asc" }
    })
    return NextResponse.json({ users })
  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
export async function PUT(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { 
      userId, email, phone, name, matricola, squadra, servizio, 
      massimale, action, newPassword, defaultServiceCategoryId, 
      defaultServiceTypeId, rotationGroupId, qualifica,
      dataAssunzione, scadenzaPatente, scadenzaPortoArmi, noteInterne
    } = body
    
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 })

    const targetUser = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } })

    if (action === "resetPassword" && newPassword) {
      const hashed = await bcrypt.hash(newPassword, 10)
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashed }
      })

      await logAudit({
        adminId: session.user.id!,
        adminName: session.user.name!,
        action: "RESET_PASSWORD",
        targetId: userId,
        targetName: targetUser?.name,
        details: `Resettata password per l'agente ${targetUser?.name}`
      })

      return NextResponse.json({ success: true, message: "Password resettata" })
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        email: email === undefined ? undefined : (email || null),
        phone: phone === undefined ? undefined : (phone || null),
        name: name || undefined,
        matricola: matricola || undefined,
        squadra: squadra === undefined ? undefined : (squadra || null),
        servizio: servizio === undefined ? undefined : (servizio || null),
        massimale: massimale !== undefined ? parseInt(massimale, 10) : undefined,
        defaultServiceCategoryId: defaultServiceCategoryId === undefined ? undefined : (defaultServiceCategoryId || null),
        defaultServiceTypeId: defaultServiceTypeId === undefined ? undefined : (defaultServiceTypeId || null),
        rotationGroupId: rotationGroupId === undefined ? undefined : (rotationGroupId || null),
        qualifica: qualifica === undefined ? undefined : (qualifica || null),
        dataAssunzione: dataAssunzione ? new Date(dataAssunzione) : (dataAssunzione === null ? null : undefined),
        scadenzaPatente: scadenzaPatente ? new Date(scadenzaPatente) : (scadenzaPatente === null ? null : undefined),
        scadenzaPortoArmi: scadenzaPortoArmi ? new Date(scadenzaPortoArmi) : (scadenzaPortoArmi === null ? null : undefined),
        noteInterne: noteInterne === undefined ? undefined : (noteInterne || null)
      }
    })

    const changes = []
    if (name) changes.push(`Nome: ${name}`)
    if (matricola) changes.push(`Matricola: ${matricola}`)
    if (squadra !== undefined) changes.push(`Squadra: ${squadra || 'Nessuna'}`)
    if (servizio !== undefined) changes.push(`Servizio: ${servizio || 'Nessuno'}`)
    if (massimale !== undefined) changes.push(`Massimale: ${massimale}`)
    if (qualifica !== undefined) changes.push(`Qualifica: ${qualifica}`)

    await logAudit({
      adminId: session.user.id!,
      adminName: session.user.name!,
      action: "UPDATE_USER",
      targetId: userId,
      targetName: updatedUser.name,
      details: `Aggiornati dati per ${updatedUser.name}: ${changes.join(", ")}`
    })

    return NextResponse.json({ success: true, user: updatedUser })
  } catch (error) {
    console.error("[USER UPDATE ERROR]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { 
      matricola, name, password, isUfficiale, squadra, massimale,
      qualifica, dataAssunzione, scadenzaPatente, scadenzaPortoArmi
    } = await req.json()
    if (!matricola || !name || !password) return NextResponse.json({ error: "Missing required fields" }, { status: 400 })

    const hashed = await bcrypt.hash(password, 10)

    const newUser = await prisma.user.create({
      data: {
        matricola,
        name,
        password: hashed,
        role: "AGENTE",
        isUfficiale: isUfficiale || false,
        squadra: squadra || null,
        massimale: massimale ? parseInt(massimale, 10) : 8,
        qualifica: qualifica || "Agente di P.L.",
        dataAssunzione: dataAssunzione ? new Date(dataAssunzione) : null,
        scadenzaPatente: scadenzaPatente ? new Date(scadenzaPatente) : null,
        scadenzaPortoArmi: scadenzaPortoArmi ? new Date(scadenzaPortoArmi) : null
      }
    })

    await logAudit({
      adminId: session.user.id!,
      adminName: session.user.name!,
      action: "CREATE_USER",
      targetId: newUser.id,
      targetName: newUser.name,
      details: `Creato nuovo agente: ${newUser.name} (Matr. ${newUser.matricola})`
    })

    return NextResponse.json({ success: true, user: newUser })
  } catch (error) {
    console.error("[USER CREATE ERROR]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { userId } = await req.json()
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 })

    const targetUser = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, matricola: true } })

    await prisma.absence.deleteMany({ where: { userId } })
    await prisma.shift.deleteMany({ where: { userId } })
    await prisma.user.delete({ where: { id: userId } })

    await logAudit({
      adminId: session.user.id!,
      adminName: session.user.name!,
      action: "DELETE_USER",
      targetId: userId,
      targetName: targetUser?.name,
      details: `Eliminato agente: ${targetUser?.name} (Matr. ${targetUser?.matricola})`
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[USER DELETE ERROR]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
