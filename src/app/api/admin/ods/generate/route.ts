// @ts-nocheck
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// Utility per ricavare gli orari dai codici (M7, P14, ecc.)
function getTimeRangeFromShiftType(type: string): string | null {
  const t = type.toUpperCase()
  if (t === "M7") return "07:00-13:00"
  if (t === "M7,30" || t === "M7.30") return "07:30-13:30"
  if (t === "M8") return "08:00-14:00"
  if (t === "P14") return "14:00-20:00"
  if (t === "P15") return "15:00-21:00"
  if (t === "P16") return "16:00-22:00"
  return null
}

function classifyShift(type: string): "M" | "P" | "N" | "OFF" {
  const t = type.toUpperCase().replace(/[()]/g, "").trim()
  if (/^M\d/.test(t)) return "M"
  if (/^P\d/.test(t)) return "P"
  if (/^[NS]\d/.test(t)) return "N"
  return "OFF"
}

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { date } = await req.json()
    if (!date) return NextResponse.json({ error: "Missing date" }, { status: 400 })

    const tenantId = session.user.tenantId
    const tf = tenantId ? { tenantId } : {}

    const targetDate = new Date(date)
    const nextDate = new Date(targetDate)
    nextDate.setDate(targetDate.getDate() + 1)

    // 1. Fetch all shifts for the target date
    const shifts = await prisma.shift.findMany({
      where: { ...tf, date: { gte: targetDate, lt: nextDate } },
      include: { user: true }
    })

    if (shifts.length === 0) {
      return NextResponse.json({ success: true, message: "Nessun turno trovato per questa data." })
    }

    // 2. Fetch all Patrol Templates and Service Categories/Types
    const [patrolTemplates, serviceCategories] = await Promise.all([
      prisma.patrolTemplate.findMany({ where: { ...tf }, include: { members: true } }),
      prisma.serviceCategory.findMany({ where: { ...tf }, include: { types: true } })
    ])

    // Prepare updates
    const updates: any[] = []
    const processedShiftIds = new Set<string>()

    // 3. Handle Fixed Patrols first
    for (const patrol of patrolTemplates) {
      const templateMemberIds = patrol.members.map(m => m.id)
      if (templateMemberIds.length < 2) continue

      // Find if these members have a working shift today
      const membersShiftsToday = shifts.filter(s => 
        templateMemberIds.includes(s.userId) && 
        classifyShift(s.type) !== "OFF" &&
        !processedShiftIds.has(s.id)
      )

      // Se almeno 2 componenti della pattuglia lavorano 
      if (membersShiftsToday.length >= 2) {
        // Devono anche essere nello stesso quadrante (M o P). Altrimenti non pattugliano insieme.
        // Raggruppo per quadrante
        const mShifts = membersShiftsToday.filter(s => classifyShift(s.type) === "M")
        const pShifts = membersShiftsToday.filter(s => classifyShift(s.type) === "P")

        let matchedShifts: any[] = []
        if (mShifts.length >= 2 && (patrol.preferredShift === "ALL" || patrol.preferredShift === "M")) {
          matchedShifts = mShifts
        } else if (pShifts.length >= 2 && (patrol.preferredShift === "ALL" || patrol.preferredShift === "P")) {
          matchedShifts = pShifts
        }

        if (matchedShifts.length >= 2) {
          const groupId = `patrol_${patrol.id}_${Date.now()}`
          for (const s of matchedShifts) {
            updates.push({
              id: s.id,
              serviceCategoryId: patrol.serviceCategoryId,
              serviceTypeId: patrol.serviceTypeId,
              vehicleId: patrol.vehicleId,
              patrolGroupId: groupId,
              timeRange: getTimeRangeFromShiftType(s.type) || s.timeRange,
              serviceDetails: s.user.servizio || patrol.members[0].servizio || null
            })
            processedShiftIds.add(s.id)
          }
        }
      }
    }

    // 4. Handle remaining individuals
    for (const s of shifts) {
      if (processedShiftIds.has(s.id)) continue
      const isWorking = classifyShift(s.type) !== "OFF"
      
      if (isWorking) {
        let catId = s.user.defaultServiceCategoryId || s.serviceCategoryId
        let typeId = s.user.defaultServiceTypeId || s.serviceTypeId

        // Se l'agente appartiene a una macro-sezione ma non ha sottomansione, assegnala in automatico
        if (catId && !typeId) {
          const catDef = serviceCategories.find(c => c.id === catId)
          if (catDef && catDef.types && catDef.types.length > 0) {
            typeId = catDef.types[0].id
          }
        }

        updates.push({
          id: s.id,
          serviceCategoryId: catId,
          serviceTypeId: typeId,
          timeRange: getTimeRangeFromShiftType(s.type) || s.timeRange,
          patrolGroupId: null, // Reset eventuali vecchi gruppi se rigenerato
          serviceDetails: s.user.servizio || null // Pre-compila con la sezione di appartenenza!
        })
      }
    }

    // 5. Apply all updates to DB
    for (const u of updates) {
      await prisma.shift.update({
        where: { id: u.id },
        data: {
          serviceCategoryId: u.serviceCategoryId,
          serviceTypeId: u.serviceTypeId,
          vehicleId: u.vehicleId,
          timeRange: u.timeRange,
          patrolGroupId: u.patrolGroupId,
          serviceDetails: u.serviceDetails
        }
      })
    }

    return NextResponse.json({ success: true, count: updates.length })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
