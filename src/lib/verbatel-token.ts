import crypto from "crypto"

const SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
if (!SECRET) {
  console.error("CRITICAL: AUTH_SECRET must be set for secure verbatel tokens!")
}
const EFFECTIVE_SECRET = SECRET || crypto.randomBytes(32).toString("hex")

export function generateVerbatelToken(tenantId: string): string {
  return crypto.createHmac("sha256", EFFECTIVE_SECRET).update(`VERBATEL_SYNC_${tenantId}`).digest("hex")
}

export function verifyVerbatelToken(tenantId: string, token: string): boolean {
  try {
    const expected = generateVerbatelToken(tenantId)
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token))
  } catch {
    return false
  }
}
