import crypto from "crypto"

function safeEqual(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a)
    const bb = Buffer.from(b)
    if (ba.length !== bb.length) return false
    return crypto.timingSafeEqual(ba, bb)
  } catch {
    return false
  }
}

/**
 * Chiave server-to-server per integrazioni (Verbatel export/sync).
 * Preferire VERBATEL_API_KEY; AUTH_SECRET accettato solo se VERBATEL_API_KEY non è impostata (migrazione).
 */
export function verifyIntegrationApiKey(providedKey: string | null | undefined): boolean {
  if (!providedKey) return false

  const verbatelKey = process.env.VERBATEL_API_KEY
  if (verbatelKey) {
    return safeEqual(providedKey, verbatelKey)
  }

  const authSecret = process.env.AUTH_SECRET
  if (authSecret) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[SECURITY] VERBATEL_API_KEY non configurata: integrazione usa AUTH_SECRET. Impostare VERBATEL_API_KEY sul server."
      )
    }
    return safeEqual(providedKey, authSecret)
  }

  return false
}
