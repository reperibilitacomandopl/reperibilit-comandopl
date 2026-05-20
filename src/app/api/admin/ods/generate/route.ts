// @ts-nocheck
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

import { inferTimeRangeFromMacro } from "@/utils/sync-shift"

function classifyShift(type: string): "M" | "P" | "N" | "OFF" {
  const t = type.toUpperCase().replace(/[()]/g, "").replace(/\s/g, "").trim()
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
    console.log("[ODS GENERATE] Start. Date:", date)
    if (!date) return NextResponse.json({ error: "Data mancante" }, { status: 400 })

    const tenantId = session.user.tenantId
    const tf = tenantId ? { tenantId } : {}

    // Robust parsing
    const datePart = typeof date === 'string' ? date.substring(0, 10) : ""
    const [y, m, d] = datePart.split("-").map(Number)
    if (isNaN(y)) return NextResponse.json({ error: "Data non valida" }, { status: 400 })

    const targetDate = new Date(Date.UTC(y, m - 1, d))
    const nextDate = new Date(targetDate)
    nextDate.setUTCDate(targetDate.getUTCDate() + 1)

    // Abbreviazione giorno per fixedServiceDays (LUN, MAR...)
    const daysAbr = ["DOM", "LUN", "MAR", "MER", "GIO", "VEN", "SAB"]
    const currentDayAbr = daysAbr[targetDate.getUTCDay()]

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
            timeRange: inferTimeRangeFromMacro(s.type) || s.timeRange,
            serviceDetails: s.serviceDetails || s.user.servizio || patrol.name || null
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

      const userFixedDays = s.user.fixedServiceDays || []
      const hasFixedDaysConfigured = userFixedDays.length > 0
      const isFixedDay = userFixedDays.includes(currentDayAbr)

      if (hasFixedDaysConfigured && !isFixedDay && s.user.fallbackServiceCategoryId) {
        // Assegna alla sezione di Fallback (es. Viabilità la domenica)
        updates.push({
          id: s.id,
          serviceCategoryId: s.user.fallbackServiceCategoryId,
          serviceTypeId: getDefaultType(s.user.fallbackServiceCategoryId),
          timeRange: inferTimeRangeFromMacro(s.type) || s.timeRange,
          patrolGroupId: null,
          serviceDetails: s.serviceDetails || "Fallback (Fuori giorni fissi)"
        })
        processedShiftIds.add(s.id)
      } else if (isFixedDay && s.user.defaultServiceCategoryId) {
        // Assegna regolarmente alla sua sezione
        updates.push({
          id: s.id,
          serviceCategoryId: s.user.defaultServiceCategoryId,
          serviceTypeId: s.user.defaultServiceTypeId || getDefaultType(s.user.defaultServiceCategoryId),
          timeRange: inferTimeRangeFromMacro(s.type) || s.timeRange,
          patrolGroupId: null,
          serviceDetails: s.serviceDetails || s.user.servizio || null
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
              timeRange: inferTimeRangeFromMacro(member.type) || member.timeRange,
              serviceDetails: member.serviceDetails || member.user.servizio || "Pattuglia"
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

      const catId = s.user.defaultServiceCategoryId || (serviceCategories.length > 0 ? serviceCategories[0].id : null)
      
      if (catId) {
        updates.push({
          id: s.id,
          serviceCategoryId: catId,
          serviceTypeId: s.user.defaultServiceTypeId || getDefaultType(catId),
          timeRange: inferTimeRangeFromMacro(s.type) || s.timeRange,
          patrolGroupId: null,
          serviceDetails: s.serviceDetails || s.user.servizio || null
        })
        processedShiftIds.add(s.id)
      }
    }

    if (updates.length > 0) {
      console.log(`[ODS GENERATE] Tentativo di aggiornamento per ${updates.length} turni.`)
      const results = await Promise.allSettled(updates.map(u => 
        prisma.shift.update({
          where: { 
            id: u.id,
          },
          data: {
            serviceCategoryId: u.serviceCategoryId,
            serviceTypeId: u.serviceTypeId,
            vehicleId: u.vehicleId || null,
            timeRange: u.timeRange,
            patrolGroupId: u.patrolGroupId,
            serviceDetails: u.serviceDetails
          }
        })
      ))
      
      const failed = results.filter(r => r.status === 'rejected')
      if (failed.length > 0) {
        console.error(`[ODS GENERATE] ${failed.length} aggiornamenti falliti su ${updates.length}.`, failed[0])
      }
      
      const successCount = results.filter(r => r.status === 'fulfilled').length
      return NextResponse.json({ success: true, count: successCount, failed: failed.length })
    }

    console.log("[ODS GENERATE] Nessun aggiornamento necessario.")
    return NextResponse.json({ success: true, count: 0 })
  } catch (error: any) {
    console.error("[ODS GENERATE ERROR]", error)
    return NextResponse.json({ 
      error: "Internal Server Error", 
      details: error.message || String(error)
    }, { status: 500 })
  }
}
