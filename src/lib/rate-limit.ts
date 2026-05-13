import { Redis } from "@upstash/redis"
import { Ratelimit } from "@upstash/ratelimit"

// Inizializzazione Redis (Upstash)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

/**
 * Crea un rate limiter configurabile.
 * Requisito AgID: Protezione Brute Force e DoS distribuita.
 */
export const createRateLimiter = (limit: number, window: string) => {
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, window as any),
    analytics: true,
    prefix: "@sentinel/ratelimit",
  })
}

// Limiter predefiniti
export const globalLimiter = createRateLimiter(60, "1 m") // 60 req/min globale
export const authLimiter = createRateLimiter(5, "10 m")   // 5 tentativi login / 10 min
export const writeLimiter = createRateLimiter(20, "1 m")  // 20 azioni scrittura / min

/**
 * Helper legacy per mantenere compatibilità durante la transizione (opzionale)
 * NOTA: Questa versione è ASYNC, al contrario della precedente.
 */
export async function checkRateLimit(identifier: string, limit: number, windowMs: number): Promise<boolean> {
  // Convertiamo windowMs in formato stringa per Upstash (es. "60000" -> "60s")
  const seconds = Math.floor(windowMs / 1000)
  const limiter = createRateLimiter(limit, `${seconds} s`)
  const { success } = await limiter.limit(identifier)
  return success
}