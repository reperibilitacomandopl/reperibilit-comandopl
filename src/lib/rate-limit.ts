import { Redis } from "@upstash/redis"
import { Ratelimit } from "@upstash/ratelimit"

// Inizializzazione Redis (Upstash) - Lazy initialization
let redis: Redis | null = null

const getRedis = () => {
  if (!redis && process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  }
  return redis
}

export const createRateLimiter = (limit: number, window: string) => {
  const r = getRedis()
  if (!r) return null
  return new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(limit, window as any),
    analytics: true,
    prefix: "@sentinel/ratelimit",
  })
}

// Limiter predefiniti
export const getGlobalLimiter = () => createRateLimiter(60, "1 m")
export const getAuthLimiter = () => createRateLimiter(5, "10 m")
export const getWriteLimiter = () => createRateLimiter(100, "1 m")
export const getBulkLimiter = () => createRateLimiter(5000, "1 m")
export const getUserLimiter = () => createRateLimiter(200, "1 m") // GET per utente
export const getOdsLimiter = () => createRateLimiter(10, "1 h") // Generazione PDF OdS

export async function checkRateLimit(identifier: string, limit: number, windowMs: number): Promise<boolean> {
  const seconds = Math.floor(windowMs / 1000)
  const limiter = createRateLimiter(limit, `${seconds} s`)
  if (!limiter) return true // Fail-safe: se Redis non disponibile, lascia passare
  const { success } = await limiter.limit(identifier)
  return success
}

// ============================================================================
// ANOMALY DETECTION — Monitoraggio consumi per tenant
// ============================================================================

const ANOMALY_WINDOW = 10 * 60 // 10 minuti in secondi
const ANOMALY_THRESHOLD_MULTIPLIER = 3 // 3x il consumo medio

/**
 * Registra un'operazione e restituisce true se il volume è anomalo.
 * Da chiamare ad ogni richiesta API autenticata.
 */
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
    // Registra operazione nel sorted set con timestamp come score
    const windowStart = now - ANOMALY_WINDOW
    await r.zadd(windowKey, { score: now, member: `${now}:${operation}` })
    // Rimuovi entry vecchie
    await r.zremrangebyscore(windowKey, 0, windowStart)
    // Conta operazioni nella finestra
    const currentCount = await r.zcard(windowKey)
    const currentRate = currentCount / (ANOMALY_WINDOW / 60) // ops/min

    // Recupera media storica
    const avgCount = await r.get(avgKey) as string | null
    const avgRate = avgCount ? parseFloat(avgCount) : currentRate

    // Aggiorna media mobile (exponential moving average, alpha=0.1)
    const newAvg = avgRate * 0.9 + currentRate * 0.1
    await r.set(avgKey, newAvg.toString(), { ex: 86400 }) // 24h TTL

    const isAnomalous = avgRate > 0 && currentRate > avgRate * ANOMALY_THRESHOLD_MULTIPLIER

    return { isAnomalous, currentRate: Math.round(currentRate), avgRate: Math.round(avgRate) }
  } catch {
    return { isAnomalous: false, currentRate: 0, avgRate: 0 }
  }
}

/**
 * Soglie di alert: restituisce un messaggio se il tenant supera la soglia di attenzione.
 */
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
