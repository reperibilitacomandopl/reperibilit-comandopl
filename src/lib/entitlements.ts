import { prisma } from "./prisma"
import { PERMESSI_104_CODES } from "@/utils/agenda-codes"

export interface EntitlementStatus {
  hasL104: boolean
  l104Assistiti: number
  l104Mode: "DAYS" | "HOURS" | "NONE"
  l104Used: number
  l104Limit: number
  hasStudyLeave: boolean
  studyLeaveUsed: number // Total for year
  studyLeaveLimit: number // 150
  hasParentalLeave: boolean
  hasChildSicknessLeave: boolean
}

/**
 * Calculates current month usage and limits for special entitlements.
 * Mode is "sticky" based on the first request of the month.
 */
export async function getEntitlementStatus(userId: string, month: number, year: number): Promise<EntitlementStatus> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      hasL104: true,
      l104Assistiti: true,
      hasStudyLeave: true,
      hasParentalLeave: true,
      hasChildSicknessLeave: true,
    }
  })

  if (!user) throw new Error("User not found")

  // 1. Fetch all L.104 requests for this month (Approved or Pending)
  const l104Requests = await prisma.agentRequest.findMany({
    where: {
      userId,
      code: { in: PERMESSI_104_CODES },
      status: { in: ["APPROVED", "PENDING"] },
      date: {
        gte: new Date(year, month - 1, 1),
        lt: new Date(year, month, 1)
      }
    }
  })

  // Determine sticky mode
  let l104Mode: "DAYS" | "HOURS" | "NONE" = "NONE"
  let l104Used = 0

  if (l104Requests.length > 0) {
    // Mode is determined by the first request (by date or creation?)
    // Technically by the first found in DB for that period
    const firstReq = l104Requests[0]
    l104Mode = (firstReq.code === "104_1H" || firstReq.code === "104_2H") ? "HOURS" : "DAYS"
    
    if (l104Mode === "DAYS") {
      // Count unique days across all L.104 requests
      const days = new Set<string>()
      l104Requests.forEach(req => {
        if (req.code === "0031" || req.code === "0038" || req.code === "104_1" || req.code === "104_2") {
          const start = new Date(req.date)
          const end = req.endDate ? new Date(req.endDate) : start
          let curr = new Date(start)
          while (curr <= end) {
            days.add(curr.toISOString().split('T')[0])
            curr.setDate(curr.getDate() + 1)
          }
        }
      })
      l104Used = days.size
    } else {
      // Sum hours
      l104Used = l104Requests.reduce((sum, req) => sum + (req.hours || 0), 0)
    }
  }

  const l104Limit = user.l104Assistiti * (l104Mode === "HOURS" ? 18 : 3)

  // 2. Study Leave (Yearly)
  const studyRequests = await prisma.agentRequest.findMany({
    where: {
      userId,
      code: "0150",
      status: { in: ["APPROVED", "PENDING"] },
      date: {
        gte: new Date(year, 0, 1),
        lt: new Date(year + 1, 0, 1)
      }
    }
  })
  const studyLeaveUsed = studyRequests.reduce((sum, req) => sum + (req.hours || 0), 0)

  return {
    hasL104: user.hasL104,
    l104Assistiti: user.l104Assistiti,
    l104Mode,
    l104Used,
    l104Limit: l104Mode === "NONE" ? user.l104Assistiti * 3 : l104Limit, // Default to days for UI if none used
    hasStudyLeave: user.hasStudyLeave,
    studyLeaveUsed,
    studyLeaveLimit: 150,
    hasParentalLeave: user.hasParentalLeave,
    hasChildSicknessLeave: user.hasChildSicknessLeave
  }
}
