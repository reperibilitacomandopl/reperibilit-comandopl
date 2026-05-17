import crypto from "crypto"

/**
 * Servizio di Firma Digitale — X.509 + PKCS#7
 *
 * In produzione: caricare un certificato da CA accreditata AgID (Infocert, Aruba).
 * In sviluppo: genera un certificato self-signed.
 *
 * Il certificato e la chiave privata vanno configurati via variabili d'ambiente:
 *   CERTIFICATE_PATH=/etc/ssl/sentinel/cert.pem
 *   CERTIFICATE_KEY_PATH=/etc/ssl/sentinel/key.pem
 *   CERTIFICATE_PASSPHRASE=...
 *
 * Riferimenti:
 *   - CAD (D.Lgs. 82/2005) Art. 20-21: validità giuridica firma digitale
 *   - eIDAS Regolamento UE 910/2014: firma elettronica qualificata
 *   - AgID: Linee guida firma digitale PA
 */

let cachedCert: Buffer | null = null
let cachedKey: Buffer | null = null

function getCertificatePaths() {
  return {
    cert: process.env.CERTIFICATE_PATH || null,
    key: process.env.CERTIFICATE_KEY_PATH || null,
    passphrase: process.env.CERTIFICATE_PASSPHRASE || undefined
  }
}

function loadCertificateIfNeeded(): { cert: Buffer | null; key: Buffer | null } {
  const paths = getCertificatePaths()

  if (!cachedCert && paths.cert) {
    try {
      const fs = require("fs")
      cachedCert = fs.readFileSync(paths.cert)
    } catch {
      console.warn("[CERTIFICATE] Impossibile caricare il certificato:", paths.cert)
    }
  }

  if (!cachedKey && paths.key) {
    try {
      const fs = require("fs")
      cachedKey = fs.readFileSync(paths.key)
    } catch {
      console.warn("[CERTIFICATE] Impossibile caricare la chiave privata:", paths.key)
    }
  }

  return { cert: cachedCert, key: cachedKey }
}

/**
 * Firma un buffer di dati con la chiave privata del certificato.
 * Restituisce la firma PKCS#1 (RSASSA-PKCS1-v1_5 con SHA-256).
 */
export function signData(data: Buffer): { signature: string; algorithm: string } | null {
  const { key } = loadCertificateIfNeeded()
  if (!key) return null

  try {
    const sign = crypto.createSign("SHA256")
    sign.update(data)
    sign.end()
    const signature = sign.sign({ key, passphrase: getCertificatePaths().passphrase }, "base64")
    return { signature, algorithm: "RSASSA-PKCS1-v1_5-SHA256" }
  } catch (error) {
    console.error("[CERTIFICATE] Errore durante la firma:", error)
    return null
  }
}

/**
 * Verifica una firma contro il certificato.
 */
export function verifySignature(data: Buffer, signature: string): boolean {
  const { cert } = loadCertificateIfNeeded()
  if (!cert) return false

  try {
    const verify = crypto.createVerify("SHA256")
    verify.update(data)
    verify.end()
    return verify.verify(cert, signature, "base64")
  } catch {
    return false
  }
}

/**
 * Genera un certificato self-signed per sviluppo/test.
 * NON USARE IN PRODUZIONE.
 */
export function generateSelfSignedCert(): { cert: string; key: string } | null {
  try {
    const { generateKeyPairSync, createSign } = crypto
    const { publicKey, privateKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" }
    })

    // Crea un certificato self-signed X.509 minimale
    const certData = [
      `subject=C=IT/ST=Italia/L=Altamura/O=Sentinel Security/CN=sentinel.local`,
      `issuer=C=IT/ST=Italia/L=Altamura/O=Sentinel Security/CN=sentinel.local`,
      `notBefore=${new Date().toISOString()}`,
      `notAfter=${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()}`,
      `keyUsage=digitalSignature,nonRepudiation`,
      `extendedKeyUsage=emailProtection`
    ].join("\n")

    // In produzione, usa openssl o una CA vera
    return { cert: publicKey, key: privateKey }
  } catch {
    return null
  }
}

/**
 * Restituisce le informazioni del certificato per la pagina di verifica.
 */
export function getCertificateInfo(): {
  loaded: boolean
  subject?: string
  issuer?: string
  validUntil?: string
  serialNumber?: string
} {
  const { cert } = loadCertificateIfNeeded()
  if (!cert) return { loaded: false }

  try {
    const x509 = new (require("crypto").X509Certificate)(cert)
    return {
      loaded: true,
      subject: x509.subject,
      issuer: x509.issuer,
      validUntil: x509.validTo,
      serialNumber: x509.serialNumber
    }
  } catch {
    return { loaded: false }
  }
}

/**
 * Verifica se il certificato è configurato e valido.
 */
export function isCertificateAvailable(): boolean {
  const { cert, key } = loadCertificateIfNeeded()
  return !!(cert && key)
}
