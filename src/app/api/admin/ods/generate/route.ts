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
  if (session?.user?.role !== "ADMIN" && !session?.user?.canManageShifts) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { date } = await req.json()
    if (!date) return NextResponse.json({ error: "Missing date" }, { status: 400 })

    const tenantId = session.user.tenantId
    const tf = tenantId ? { tenantId } : {}

    const targetDate = new Date(date)
    const nextDate = new Date(targetDate)
    nextDate.setDate(targetDate.getDate() + 1)

    // Abbreviazione giorno per fixedServiceDays (LUN, MAR...)
    const daysAbr = ["DOM", "LUN", "MAR", "MER", "GIO", "VEN", "SAB"]
    const currentDayAbr = daysAbr[targetDate.getDay()]

    // 1. Fetch data
    const [shifts, patrolTemplates, serviceCategories] = await Promise.all([
      prisma.shift.findMany({
        where: { ...tf, date: { gte: targetDate, lt: nextDate } },
        include: { user: true }
      }),
      prisma.patrolTemplate.findMany({ where: { ...tf }, include: { members: true } }),
      prisma.serviceCategory.findMany({ where: { ...tf }, include: { types: true } })
    ])

    if (shifts.length === 0) {
      return NextResponse.json({ success: true, message: "Nessun turno trovato." })
    }

    const updates: any[] = []
    const processedShiftIds = new Set<string>()

    // Helper per trovare il primo tipo di servizio di una categoria
    const getDefaultType = (catId: string) => {
      const cat = serviceCategories.find(c => c.id === catId)
      return cat?.types?.[0]?.id || null
    }

    // --- PRIORITÀ 1: Modelli Pattuglia Fissi (Istituzionali) ---
    for (const patrol of patrolTemplates) {
      const templateMemberIds = patrol.members.map(m => m.id)
      if (templateMemberIds.length < 2) continue

      const membersShiftsToday = shifts.filter(s => 
        templateMemberIds.includes(s.userId) && 
        classifyShift(s.type) !== "OFF" &&
        !processedShiftIds.has(s.id)
      )

      if (membersShiftsToday.length < 2) continue

      const mShifts = membersShiftsToday.filter(s => classifyShift(s.type) === "M")
      const pShifts = membersShiftsToday.filter(s => classifyShift(s.type) === "P")

      const createPatrolUpdates = (matched: any[]) => {
        if (matched.length < 2) return
        const groupId = `template_${patrol.id}_${Date.now()}`
        for (const s of matched) {
          updates.push({
            id: s.id,
            serviceCategoryId: patrol.serviceCategoryId,
            serviceTypeId: patrol.serviceTypeId || getDefaultType(patrol.serviceCategoryId),
            vehicleId: patrol.vehicleId,
            patrolGroupId: groupId,
            timeRange: getTimeRangeFromShiftType(s.type) || s.timeRange,
            serviceDetails: s.user.servizio || patrol.name || null
          })
          processedShiftIds.add(s.id)
        }
      }

      if (patrol.preferredShift === "M" || patrol.preferredShift === "ALL") createPatrolUpdates(mShifts)
      if (patrol.preferredShift === "P" || patrol.preferredShift === "ALL") createPatrolUpdates(pShifts)
    }

    // --- PRIORITÀ 2: Giorni di Servizio Fissi (fixedServiceDays) ---
    for (const s of shifts) {
      if (processedShiftIds.has(s.id)) continue
      if (classifyShift(s.type) === "OFF") continue

      const isFixedDay = s.user.fixedServiceDays?.includes(currentDayAbr)
      if (isFixedDay && s.user.defaultServiceCategoryId) {
        updates.push({
          id: s.id,
          serviceCategoryId: s.user.defaultServiceCategoryId,
          serviceTypeId: s.user.defaultServiceTypeId || getDefaultType(s.user.defaultServiceCategoryId),
          timeRange: getTimeRangeFromShiftType(s.type) || s.timeRange,
          patrolGroupId: null,
          serviceDetails: s.user.servizio || null
        })
        processedShiftIds.add(s.id)
      }
    }

    // --- PRIORITÀ 3: Matching Compagni Preferiti (defaultPartnerIds) ---
    const quadrants = ["M", "P"]
    for (const q of quadrants) {
      const availableShifts = shifts.filter(s => 
        classifyShift(s.type) === q && 
        !processedShiftIds.has(s.id)
      )

      for (const s of availableShifts) {
        if (processedShiftIds.has(s.id)) continue
        if (!s.user.defaultPartnerIds || s.user.defaultPartnerIds.length === 0) continue

        let matchedPartnerShift = null
        for (const pId of s.user.defaultPartnerIds) {
          const partnerShift = availableShifts.find(ps => 
            ps.userId === pId && 
            !processedShiftIds.has(ps.id)
          )
          if (partnerShift) {
            matchedPartnerShift = partnerShift
            break
          }
        }

        if (matchedPartnerShift) {
          const groupId = `partner_${s.id}_${matchedPartnerShift.id}`
          const commonCatId = s.user.defaultServiceCategoryId || matchedPartnerShift.user.defaultServiceCategoryId || serviceCategories[0]?.id
          
          const pair = [s, matchedPartnerShift]
          for (const member of pair) {
            updates.push({
              id: member.id,
              serviceCategoryId: member.user.defaultServiceCategoryId || commonCatId,
              serviceTypeId: member.user.defaultServiceTypeId || getDefaultType(member.user.defaultServiceCategoryId || commonCatId),
              patrolGroupId: groupId,
              timeRange: getTimeRangeFromShiftType(member.type) || member.timeRange,
              serviceDetails: member.user.servizio || "Pattuglia"
            })
            processedShiftIds.add(member.id)
          }
        }
      }
    }

    // --- PRIORITÀ 4: Individuali Rimanenti ---
    for (const s of shifts) {
      if (processedShiftIds.has(s.id)) continue
      if (classifyShift(s.type) === "OFF") continue

      updates.push({
        id: s.id,
        serviceCategoryId: s.user.defaultServiceCategoryId || null,
        serviceTypeId: s.user.defaultServiceTypeId || (s.user.defaultServiceCategoryId ? getDefaultType(s.user.defaultServiceCategoryId) : null),
        timeRange: getTimeRangeFromShiftType(s.type) || s.timeRange,
        patrolGroupId: null,
        serviceDetails: s.user.servizio || null
      })
      processedShiftIds.add(s.id)
    }

    for (const u of updates) {
      await prisma.shift.update({
        where: { 
          id: u.id,
          tenantId: tenantId || null
        },
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
