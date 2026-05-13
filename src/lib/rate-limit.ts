import { Redis } from "@upstash/redis"
import { Ratelimit } from "@upstash/ratelimit"

// Inizializzazione Redis (Upstash) - Lazy initialization per evitare errori in build
let redis: Redis | null = null;

const getRedis = () => {
  if (!redis && process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  }
  return redis;
}

/**
 * Crea un rate limiter configurabile.
 * Requisito AgID: Protezione Brute Force e DoS distribuita.
 */
export const createRateLimiter = (limit: number, window: string) => {
  const r = getRedis();
  if (!r) return null; // Fallback se Redis non è configurato

  return new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(limit, window as any),
    analytics: true,
    prefix: "@sentinel/ratelimit",
  })
}

// Limiter predefiniti (Lazy)
export const getGlobalLimiter = () => createRateLimiter(60, "1 m")
export const getAuthLimiter = () => createRateLimiter(5, "10 m")
export const getWriteLimiter = () => createRateLimiter(100, "1 m") // Alzato a 100 per operazioni standard
export const getBulkLimiter = () => createRateLimiter(5000, "1 m") // Per importazioni da 1000-2000 turni

/**
 * Helper legacy per mantenere compatibilità durante la transizione (opzionale)
 * NOTA: Questa versione è ASYNC, al contrario della precedente.
 */
export async function checkRateLimit(identifier: string, limit: number, windowMs: number): Promise<boolean> {
  // Convertiamo windowMs in formato stringa per Upstash (es. "60000" -> "60s")
  const seconds = Math.floor(windowMs / 1000)
  const limiter = createRateLimiter(limit, `${seconds} s`)
  
  // Fail-safe: se Redis non è disponibile, lasciamo passare
  if (!limiter) return true;
  
  const { success } = await limiter.limit(identifier)
  return success
}