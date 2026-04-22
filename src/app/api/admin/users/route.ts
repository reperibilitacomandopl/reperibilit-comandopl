// @ts-nocheck
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { logAudit } from "@/lib/audit"

const rankMap = [
  { rank: "DIRIGENTE GENERALE", level: 1 },
  { rank: "DIRIGENTE SUPERIORE", level: 2 },
  { rank: "DIRIGENTE", level: 3 },
  { rank: "COMANDANTE", level: 3 },
  { rank: "COMMISSARIO SUPERIORE", level: 4 },
  { rank: "COMMISSARIO CAPO", level: 5 },
  { rank: "COMMISSARIO", level: 6 },
  { rank: "VICE COMMISSARIO", level: 7 },
  { rank: "ISPETTORE SUPERIORE", level: 8 },
  { rank: "ISPETTORE CAPO", level: 9 },
  { rank: "ISPETTORE", level: 10 },
  { rank: "VICE ISPETTORE", level: 11 },
  { rank: "SOVRINTENDENTE CAPO", level: 12 },
  { rank: "SOVRINTENDENTE", level: 13 },
  { rank: "VICE SOVRINTENDENTE", level: 14 },
  { rank: "ASSISTENTE CAPO", level: 15 },
  { rank: "ASSISTENTE", level: 15 },
  { rank: "AGENTE SCELTO", level: 16 },
  { rank: "AGENTE DI P.L.", level: 17 },
  { rank: "AGENTE", level: 17 }
];

function getGradoLivello(qualifica: string | null | undefined): number {
  if (!qualifica) return 99;
  const qStr = qualifica.toUpperCase().trim();
  for (const r of rankMap) { if (qStr === r.rank) return r.level; }
  for (const r of rankMap) { if (qStr.includes(r.rank)) return r.level; }
  return 99;
}

export async function GET(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && !session?.user?.canManageUsers) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const tenantId = session.user.tenantId
    if (!tenantId) return NextResponse.json({ error: "Tenant non identificato" }, { status: 400 })
    
    const users = await prisma.user.findMany({
      where: { role: "AGENTE", tenantId, isActive: true },
      orderBy: { name: "asc" }
    })
    return NextResponse.json({ users })
  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && !session?.user?.canManageUsers) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { 
      userId, email, phone, name, matricola, squadra, servizio, 
      massimale, action, newPassword, defaultServiceCategoryId, 
      defaultServiceTypeId, rotationGroupId, qualifica,
      dataAssunzione, scadenzaPatente, scadenzaPortoArmi, noteInterne,
      dataDiNascita, tipoContratto, defaultPartnerIds, fixedServiceDays,
      hasL104, l104Assistiti, hasStudyLeave, hasParentalLeave, hasChildSicknessLeave
    } = await req.json()
    
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    const tenantId = session.user.tenantId

    const targetUser = await prisma.user.findFirst({ 
      where: { id: userId, tenantId: tenantId || null }, 
      select: { name: true, matricola: true } 
    })
    if (!targetUser) return NextResponse.json({ error: "Utente non trovato o non appartenente al tuo comando" }, { status: 404 })

    if (action === "resetPassword" && newPassword) {
      const hashed = await bcrypt.hash(newPassword, 10)
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashed }
      })

      await logAudit({
        tenantId,
        adminId: session.user.id!,
        adminName: session.user.name!,
        action: "RESET_PASSWORD",
        targetId: userId,
        targetName: targetUser?.name,
        details: `Resettata password per l'agente ${targetUser?.name}`
      })

      return NextResponse.json({ success: true, message: "Password resettata" })
    }

    if (action === "restore") {
      const originalMatricola = targetUser.matricola.split("_ARCHIVED_")[0]
      
      // Verifica se la matricola originale è stata ripresa da qualcun altro nel frattempo
      const collision = await prisma.user.findFirst({
        where: { matricola: originalMatricola, tenantId: tenantId || null, isActive: true }
      })
      
      if (collision) {
        return NextResponse.json({ error: "Impossibile ripristinare: la matricola originale è già in uso da un altro agente attivo." }, { status: 409 })
      }

      const restoredUser = await prisma.user.update({
        where: { id: userId },
        data: { 
          isActive: true,
          matricola: originalMatricola
        }
      })

      await logAudit({
        tenantId: tenantId || null,
        adminId: session.user.id!,
        adminName: session.user.name!,
        action: "RESTORE_USER",
        targetId: userId,
        targetName: restoredUser.name,
        details: `Ripristinato agente dall'archivio: ${restoredUser.name} (Matr. ${restoredUser.matricola})`
      })

      return NextResponse.json({ success: true, user: restoredUser })
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
        gradoLivello: qualifica ? getGradoLivello(qualifica) : undefined,
        dataAssunzione: dataAssunzione ? new Date(dataAssunzione) : (dataAssunzione === null ? null : undefined),
        dataDiNascita: dataDiNascita ? new Date(dataDiNascita) : (dataDiNascita === null ? null : undefined),
        scadenzaPatente: scadenzaPatente ? new Date(scadenzaPatente) : (scadenzaPatente === null ? null : undefined),
        scadenzaPortoArmi: scadenzaPortoArmi ? new Date(scadenzaPortoArmi) : (scadenzaPortoArmi === null ? null : undefined),
        tipoContratto: tipoContratto === undefined ? undefined : (tipoContratto || null),
        noteInterne: noteInterne === undefined ? undefined : (noteInterne || null),
        defaultPartnerIds: defaultPartnerIds === undefined ? undefined : defaultPartnerIds,
        fixedServiceDays: fixedServiceDays === undefined ? undefined : fixedServiceDays,
        hasL104: hasL104 === undefined ? undefined : hasL104,
        l104Assistiti: l104Assistiti === undefined ? undefined : parseInt(l104Assistiti, 10),
        hasStudyLeave: hasStudyLeave === undefined ? undefined : hasStudyLeave,
        hasParentalLeave: hasParentalLeave === undefined ? undefined : hasParentalLeave,
        hasChildSicknessLeave: hasChildSicknessLeave === undefined ? undefined : hasChildSicknessLeave
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
      tenantId: tenantId || null,
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
  if (session?.user?.role !== "ADMIN" && !session?.user?.canManageUsers) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { 
      matricola, name, password, isUfficiale, squadra, massimale,
      qualifica, dataAssunzione, scadenzaPatente, scadenzaPortoArmi,
      dataDiNascita, tipoContratto, defaultPartnerIds, fixedServiceDays,
      hasL104, l104Assistiti, hasStudyLeave, hasParentalLeave, hasChildSicknessLeave
    } = await req.json()
    if (!matricola || !name || !password) return NextResponse.json({ error: "Missing required fields" }, { status: 400 })

    const tenantId = session.user.tenantId
    if (tenantId) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { maxAgents: true }
      });
      if (tenant) {
        const currentCount = await prisma.user.count({
          where: { tenantId, isActive: true, isSuperAdmin: false }
        });
        if (currentCount >= tenant.maxAgents) {
          return NextResponse.json({ error: "PLAN_LIMIT_REACHED" }, { status: 403 });
        }
      }
    }

    const existing = await prisma.user.findFirst({ 
      where: { matricola, tenantId: tenantId || null } 
    })
    if (existing) return NextResponse.json({ error: "Matricola già esistente in questo comando" }, { status: 409 })

    const hashed = await bcrypt.hash(password, 10)

    const newUser = await prisma.user.create({
      data: {
        tenantId: tenantId || null,
        matricola,
        name,
        password: hashed,
        role: "AGENTE",
        isUfficiale: isUfficiale || false,
        squadra: squadra || null,
        massimale: massimale ? parseInt(massimale, 10) : 8,
        qualifica: qualifica || "Agente di P.L.",
        gradoLivello: getGradoLivello(qualifica || "Agente di P.L."),
        dataAssunzione: dataAssunzione ? new Date(dataAssunzione) : null,
        dataDiNascita: dataDiNascita ? new Date(dataDiNascita) : null,
        scadenzaPatente: scadenzaPatente ? new Date(scadenzaPatente) : null,
        scadenzaPortoArmi: scadenzaPortoArmi ? new Date(scadenzaPortoArmi) : null,
        tipoContratto: tipoContratto || null,
        defaultPartnerIds: defaultPartnerIds || [],
        fixedServiceDays: fixedServiceDays || [],
        hasL104: hasL104 || false,
        l104Assistiti: l104Assistiti ? parseInt(l104Assistiti, 10) : 1,
        hasStudyLeave: hasStudyLeave || false,
        hasParentalLeave: hasParentalLeave || false,
        hasChildSicknessLeave: hasChildSicknessLeave || false
      }
    })

    await logAudit({
      tenantId,
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
  if (session?.user?.role !== "ADMIN" && !session?.user?.canManageUsers) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { userId } = await req.json()
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    const tenantId = session.user.tenantId

    const targetUser = await prisma.user.findFirst({ 
      where: { id: userId, tenantId: tenantId || null }, 
      select: { name: true, matricola: true } 
    })
    if (!targetUser) return NextResponse.json({ error: "Utente non trovato o non appartenente al tuo comando" }, { status: 404 })

    const timestamp = Date.now()
    await prisma.user.update({ 
      where: { id: userId },
      data: { 
        isActive: false,
        matricola: `${targetUser.matricola}_ARCHIVED_${timestamp}`
      }
    })

    await logAudit({
      tenantId,
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
