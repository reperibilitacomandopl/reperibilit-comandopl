import { Redis } from "@upstash/redis"
import { Ratelimit } from "@upstash/ratelimit"

// Inizializzazione Redis (Upstash) - Lazy initialization
let redis: Redis | null = null

const getRedis = () => {
  if (process.env.DISABLE_UPSTASH === "1") return null
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim()
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  if (!url || !token) return null
  if (!redis) {
    redis = new Redis({ url, token })
  }
  return redis
}

type Limiter = {
  limit: (identifier: string) => Promise<{
    success: boolean
    limit: number
    remaining: number
    reset: number
  }>
}

const memoryBuckets = new Map<string, { count: number; resetAt: number }>()

function parseWindowMs(window: string): number {
  const m = window.trim().match(/^(\d+)\s*(s|m|h|d)$/i)
  if (!m) return 60_000
  const n = parseInt(m[1], 10)
  const unit = m[2].toLowerCase()
  if (unit === "s") return n * 1000
  if (unit === "m") return n * 60_000
  if (unit === "h") return n * 3_600_000
  return n * 86_400_000
}

/** Fallback in-memory per VM singola (Oracle) quando Upstash non è configurato. */
function createMemoryLimiter(limit: number, window: string): Limiter {
  const windowMs = parseWindowMs(window)
  return {
    limit: async (identifier: string) => {
      const now = Date.now()
      const key = `${identifier}:${window}`
      let entry = memoryBuckets.get(key)
      if (!entry || now >= entry.resetAt) {
        entry = { count: 1, resetAt: now + windowMs }
        memoryBuckets.set(key, entry)
        return { success: true, limit, remaining: limit - 1, reset: entry.resetAt }
      }
      entry.count += 1
      const success = entry.count <= limit
      return {
        success,
        limit,
        remaining: Math.max(0, limit - entry.count),
        reset: entry.resetAt,
      }
    },
  }
}

/** Disabilita Upstash per il processo se quota esaurita o errore di rete. */
let upstashDisabled = false

function disableUpstash(reason: string) {
  if (!upstashDisabled) {
    upstashDisabled = true
    console.warn(`[RATE_LIMIT] Upstash disattivato: ${reason}. Fallback in-memory attivo.`)
  }
}

function createUpstashLimiter(limit: number, window: string): Limiter {
  const memory = createMemoryLimiter(limit, window)
  const r = getRedis()
  if (!r || upstashDisabled) return memory

  const ratelimit = new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(limit, window as `${number} s` | `${number} m` | `${number} h` | `${number} d`),
  })

  return {
    limit: async (identifier: string) => {
      try {
        const result = await ratelimit.limit(identifier)
        return {
          success: result.success,
          limit: result.limit,
          remaining: result.remaining,
          reset: result.reset,
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        disableUpstash(msg)
        return memory.limit(identifier)
      }
    },
  }
}

export const createRateLimiter = (limit: number, window: string): Limiter => {
  const r = getRedis()
  if (r && !upstashDisabled) {
    return createUpstashLimiter(limit, window)
  }

  if (process.env.NODE_ENV === "production" && !r) {
    console.warn(
      `[RATE_LIMIT] Upstash non configurato: uso limiter in-memory (${limit}/${window}).`
    )
  }

  return createMemoryLimiter(limit, window)
}

// Limiter predefiniti
export const getGlobalLimiter = () => createRateLimiter(60, "1 m")
export const getAuthLimiter = () => createRateLimiter(5, "10 m")
export const getWriteLimiter = () => createRateLimiter(100, "1 m")
export const getBulkLimiter = () => createRateLimiter(5000, "1 m")
export const getUserLimiter = () => createRateLimiter(200, "1 m")
export const getOdsLimiter = () => createRateLimiter(10, "1 h")

export async function checkRateLimit(identifier: string, limit: number, windowMs: number): Promise<boolean> {
  const seconds = Math.max(1, Math.floor(windowMs / 1000))
  const limiter = createRateLimiter(limit, `${seconds} s`)
  const { success } = await limiter.limit(identifier)
  return success
}

// ============================================================================
// ANOMALY DETECTION — Monitoraggio consumi per tenant
// ============================================================================

const ANOMALY_WINDOW = 10 * 60
const ANOMALY_THRESHOLD_MULTIPLIER = 3

export async function trackOperation(tenantId: string, operation: string): Promise<{
  isAnomalous: boolean
  currentRate: number
  avgRate: number
}> {
  const r = getRedis()
  if (!r) return { isAnomalous: false, currentRate: 0, avgRate: 0 }

  const now = Math.floor(Date.now() / 1000)
  const windowKey = `@sentinel/anomaly:${tenantId}:window`
  const avgKey = `@sentinel/anomaly:${tenantId}:avg`

  try {
    const windowStart = now - ANOMALY_WINDOW
    await r.zadd(windowKey, { score: now, member: `${now}:${operation}` })
    await r.zremrangebyscore(windowKey, 0, windowStart)
    const currentCount = await r.zcard(windowKey)
    const currentRate = currentCount / (ANOMALY_WINDOW / 60)

    const avgCount = await r.get(avgKey) as string | null
    const avgRate = avgCount ? parseFloat(avgCount) : currentRate

    const newAvg = avgRate * 0.9 + currentRate * 0.1
    await r.set(avgKey, newAvg.toString(), { ex: 86400 })

    const isAnomalous = avgRate > 0 && currentRate > avgRate * ANOMALY_THRESHOLD_MULTIPLIER

    return { isAnomalous, currentRate: Math.round(currentRate), avgRate: Math.round(avgRate) }
  } catch {
    return { isAnomalous: false, currentRate: 0, avgRate: 0 }
  }
}

export async function getTenantUsageSummary(tenantId: string): Promise<{
  opsLast10Min: number
  avgOpsPerMin: number
  status: "normal" | "warning" | "critical"
}> {
  const r = getRedis()
  if (!r) return { opsLast10Min: 0, avgOpsPerMin: 0, status: "normal" }

  try {
    const now = Math.floor(Date.now() / 1000)
    const windowStart = now - ANOMALY_WINDOW
    const windowKey = `@sentinel/anomaly:${tenantId}:window`
    const avgKey = `@sentinel/anomaly:${tenantId}:avg`

    const opsLast10Min = await r.zcard(windowKey) || 0
    const avgStr = await r.get(avgKey) as string | null
    const avgOpsPerMin = avgStr ? Math.round(parseFloat(avgStr)) : 0

    let status: "normal" | "warning" | "critical" = "normal"
    if (avgOpsPerMin > 0) {
      const ratio = (opsLast10Min / (ANOMALY_WINDOW / 60)) / avgOpsPerMin
      if (ratio > 5) status = "critical"
      else if (ratio > 3) status = "warning"
    }

    return { opsLast10Min, avgOpsPerMin, status }
  } catch {
    return { opsLast10Min: 0, avgOpsPerMin: 0, status: "normal" }
  }
}
