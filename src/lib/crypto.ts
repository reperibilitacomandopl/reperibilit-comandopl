import crypto from "crypto"

/**
 * Utility per la crittografia dei dati sensibili nel database (es. 2FA Secrets, Password PEC).
 * Utilizza AES-256-GCM.
 */

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

// Usiamo AUTH_SECRET come base per la chiave di crittografia
const ENCRYPTION_KEY = Buffer.from(
  crypto.createHash("sha256").update(process.env.AUTH_SECRET || "default-secret").digest("hex").substring(0, 32)
)

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv)
  
  let encrypted = cipher.update(text, "utf8", "hex")
  encrypted += cipher.final("hex")
  
  const authTag = cipher.getAuthTag().toString("hex")
  
  // Formato: iv:authTag:encrypted
  return `${iv.toString("hex")}:${authTag}:${encrypted}`
}

export function decrypt(encryptedData: string): string {
  try {
    const [ivHex, authTagHex, encryptedText] = encryptedData.split(":")
    
    if (!ivHex || !authTagHex || !encryptedText) {
      // Se non è nel formato crittografato, restituisci l'originale (fallback per migrazione)
      return encryptedData
    }

    const iv = Buffer.from(ivHex, "hex")
    const authTag = Buffer.from(authTagHex, "hex")
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv)
    
    decipher.setAuthTag(authTag)
    
    let decrypted = decipher.update(encryptedText, "hex", "utf8")
    decrypted += decipher.final("utf8")
    
    return decrypted
  } catch (error) {
    // Se la decrittazione fallisce, probabilmente è un dato in chiaro o la chiave è cambiata
    return encryptedData
  }
}
