import crypto from "crypto"
import path from "path"

/**
 * Storage Service — Signed URL per file con isolamento tenant.
 *
 * Organizza i file in: /tenants/{tenantId}/{context}/{fileId}.{ext}
 * Genera signed URL con scadenza configurabile (default 15 minuti).
 *
 * Implementazione attuale: file system locale + signed URL HMAC.
 * In produzione: sostituire con S3/R2 usando @aws-sdk/s3-request-presigner.
 */

const STORAGE_ROOT = process.env.STORAGE_PATH || "/data/storage"

// H13 FIX: Non usare "default-secret" — richiedere esplicitamente un segreto
const SIGNING_SECRET = process.env.STORAGE_SIGNING_SECRET || process.env.AUTH_SECRET
if (!SIGNING_SECRET) {
  console.error("CRITICAL: STORAGE_SIGNING_SECRET or AUTH_SECRET must be set for secure storage!")
}
const EFFECTIVE_SECRET = SIGNING_SECRET || crypto.randomBytes(32).toString("hex") // Fallback non persistente

const DEFAULT_TTL = 15 * 60 // 15 minuti

interface SignedUrlPayload {
  path: string
  exp: number
}

export function generateSignedUrl(
  tenantId: string,
  context: "documents" | "logos" | "exports" | "temp",
  fileName: string,
  ttlSeconds: number = DEFAULT_TTL
): string {
  const filePath = `tenants/${tenantId}/${context}/${fileName}`
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds

  const payload: SignedUrlPayload = { path: filePath, exp }
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url")
  const signature = crypto
    .createHmac("sha256", EFFECTIVE_SECRET)
    .update(data)
    .digest("base64url")

  return `/api/storage?token=${data}.${signature}`
}

export function verifySignedUrl(token: string): SignedUrlPayload | null {
  try {
    const [data, signature] = token.split(".")
    if (!data || !signature) return null

    const expectedSig = crypto
      .createHmac("sha256", EFFECTIVE_SECRET)
      .update(data)
      .digest("base64url")

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null
    }

    const payload: SignedUrlPayload = JSON.parse(
      Buffer.from(data, "base64url").toString("utf8")
    )

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null // Scaduto
    }

    // Verifica isolamento tenant nel path
    if (!payload.path.startsWith("tenants/")) {
      return null
    }

    return payload
  } catch {
    return null
  }
}

export function getStoragePath(tenantId: string, context: string): string {
  return `${STORAGE_ROOT}/tenants/${tenantId}/${context}`
}

export function getAbsolutePath(relativePath: string): string {
  // H14 FIX: Usare path.resolve + startsWith per prevenire directory traversal
  // La semplice sostituzione di ".." con regex è bypassabile (es. "....//", encoding, etc.)
  const resolved = path.resolve(STORAGE_ROOT, relativePath)
  const normalizedRoot = path.resolve(STORAGE_ROOT)
  
  if (!resolved.startsWith(normalizedRoot + path.sep) && resolved !== normalizedRoot) {
    throw new Error("Path traversal detected — access denied")
  }
  
  return resolved
}
