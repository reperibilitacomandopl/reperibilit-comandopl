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
const ENCRYPTION_KEY = RAW_SECRET
  ? Buffer.from(crypto.hkdfSync("sha512", RAW_SECRET, SALT, "sentinel-encryption-key", 32))
  : crypto.randomBytes(32) // Fallback solo per evitare crash durante il build, ma non funzionerà per decriptare

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

export function decrypt(encryptedData: string): string {
  if (!RAW_SECRET) throw new Error("Encryption secret not configured")

  const [ivHex, authTagHex, encryptedText] = encryptedData.split(":")
  
  // H2 FIX: Se il formato non è valido, lanciare errore anziché restituire il plaintext
  if (!ivHex || !authTagHex || !encryptedText) {
    throw new Error("Invalid encrypted data format — possible plaintext or corrupted data")
  }

  const iv = Buffer.from(ivHex, "hex")
  const authTag = Buffer.from(authTagHex, "hex")
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv)
  
  decipher.setAuthTag(authTag)
  
  let decrypted = decipher.update(encryptedText, "hex", "utf8")
  decrypted += decipher.final("utf8")
  
  return decrypted
}
