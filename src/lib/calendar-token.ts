import crypto from "crypto"

/**
 * Genera e verifica token HMAC firmati per la sottoscrizione al calendario.
 * Questo impedisce l'accesso diretto tramite UUID (IDOR attack).
 * Il token è legato all'userId e al AUTH_SECRET del server.
 */

const SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || ""

export function generateCalendarToken(userId: string): string {
  return crypto.createHmac("sha256", SECRET).update(userId).digest("hex")
}

export function verifyCalendarToken(userId: string, token: string): boolean {
  const expected = generateCalendarToken(userId)
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token))
}
