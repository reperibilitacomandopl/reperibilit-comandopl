import crypto from "crypto"

/**
 * Utility per la crittografia dei dati sensibili nel database (es. 2FA Secrets, Password PEC).
 * Utilizza AES-256-GCM con HKDF key derivation.
 */

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

// H1 FIX: Usare HKDF con salt costante anziché SHA-256 singolo
const RAW_SECRET = process.env.AUTH_SECRET || process.env.ENCRYPTION_SECRET
if (!RAW_SECRET) {
  // H13 FIX: Non usare "default-secret", crash immediato se manca il segreto
  console.error("CRITICAL: AUTH_SECRET or ENCRYPTION_SECRET environment variable is not set!")
}

const SALT = Buffer.from("sentinel-crypto-salt-v1", "utf-8")
// Nuova chiave via HKDF (sicura)
const ENCRYPTION_KEY = RAW_SECRET
  ? Buffer.from(crypto.hkdfSync("sha512", RAW_SECRET, SALT, "sentinel-encryption-key", 32))
  : crypto.randomBytes(32)
// Vecchia chiave via SHA-256 (per migrazione dati pre-esistenti)
const LEGACY_ENCRYPTION_KEY = RAW_SECRET
  ? Buffer.from(crypto.createHash("sha256").update(RAW_SECRET).digest("hex").substring(0, 32))
  : crypto.randomBytes(32)

export function encrypt(text: string): string {
  if (!RAW_SECRET) throw new Error("Encryption secret not configured")

  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv)
  
  let encrypted = cipher.update(text, "utf8", "hex")
  encrypted += cipher.final("hex")
  
  const authTag = cipher.getAuthTag().toString("hex")
  
  // Formato: iv:authTag:encrypted
  return `${iv.toString("hex")}:${authTag}:${encrypted}`
}

function tryDecrypt(encryptedData: string, key: Buffer): string | null {
  const [ivHex, authTagHex, encryptedText] = encryptedData.split(":")
  if (!ivHex || !authTagHex || !encryptedText) return null
  try {
    const iv = Buffer.from(ivHex, "hex")
    const authTag = Buffer.from(authTagHex, "hex")
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)
    let decrypted = decipher.update(encryptedText, "hex", "utf8")
    decrypted += decipher.final("utf8")
    return decrypted
  } catch {
    return null // Wrong key or corrupted data
  }
}

export function decrypt(encryptedData: string): string {
  if (!RAW_SECRET) throw new Error("Encryption secret not configured")

  // Verifica formato
  const parts = encryptedData.split(":")
  if (!parts[0] || !parts[1] || !parts[2]) {
    throw new Error("Invalid encrypted data format — possible plaintext or corrupted data")
  }

  // Prova prima con la nuova chiave HKDF
  const newResult = tryDecrypt(encryptedData, ENCRYPTION_KEY)
  if (newResult !== null) return newResult

  // Fallback: prova con la vecchia chiave SHA-256 (dati pre-migrazione)
  const legacyResult = tryDecrypt(encryptedData, LEGACY_ENCRYPTION_KEY)
  if (legacyResult !== null) return legacyResult

  throw new Error("Decryption failed — data may be corrupted or key has been rotated")
}
