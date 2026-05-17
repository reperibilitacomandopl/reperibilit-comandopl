import crypto from "crypto"

/**
 * Servizio di Timestamping RFC 3161
 *
 * Prova che un documento esisteva in un preciso momento,
 * opponibile a terzi anche in caso di modifica dell'orologio del server.
 *
 * TSA (Time Stamping Authority) gratuite:
 *   - FreeTSA: https://freetsa.org/tsr
 *   - DigiCert TSA: https://timestamp.digicert.com
 *
 * In produzione per PA: usare una TSA accreditata AgID.
 */

const TSA_URL = process.env.TSA_URL || "https://freetsa.org/tsr"
const TSA_TIMEOUT = 15000 // 15 secondi

/**
 * Genera un timestamp token RFC 3161 per un hash di dati.
 * @param hash — SHA-256 hash dei dati da timestampare (Buffer o hex string)
 * @returns il timestamp token DER come base64, o null in caso di errore
 */
export async function requestTimestamp(hash: Buffer | string): Promise<{
  token: string       // Timestamp token in base64
  tsaUrl: string      // URL della TSA utilizzata
  timestamp: string   // Data/ora ISO 8601
} | null> {
  const hashBuffer = typeof hash === "string" ? Buffer.from(hash, "hex") : hash

  try {
    // Costruisci la richiesta di timestamp (TimeStampReq) in formato DER minimale
    // Questo è un formato semplificato; per una implementazione completa usare una libreria ASN.1
    const nonce = crypto.randomBytes(8)

    // TimeStampReq (RFC 3161 sezione 2.4.1) — formato binario ASN.1 DER
    // Per compatibilità con FreeTSA, inviamo il digest direttamente
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), TSA_TIMEOUT)

    const tsReqBody = buildTimestampRequest(hashBuffer, nonce)

    const response = await fetch(TSA_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/timestamp-query",
        "Content-Transfer-Encoding": "binary"
      },
      body: tsReqBody as any as BodyInit,
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error(`[TSA] Errore HTTP ${response.status} da ${TSA_URL}`)
      return null
    }

    const tokenBuffer = await response.arrayBuffer()

    if (tokenBuffer.byteLength === 0) {
      console.error("[TSA] Risposta vuota")
      return null
    }

    const token = Buffer.from(tokenBuffer).toString("base64")

    return {
      token,
      tsaUrl: TSA_URL,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error("[TSA] Errore richiesta timestamp:", error)
    return null
  }
}

/**
 * Costruisce una TimeStampReq ASN.1 DER minimale.
 *
 * TimeStampReq ::= SEQUENCE {
 *   version         INTEGER { v1(1) },
 *   messageImprint  MessageImprint,
 *   nonce           INTEGER (opzionale),
 *   certReq         BOOLEAN DEFAULT FALSE,
 *   extensions      [0] IMPLICIT Extensions OPTIONAL
 * }
 *
 * MessageImprint ::= SEQUENCE {
 *   hashAlgorithm   AlgorithmIdentifier,
 *   hashedMessage   OCTET STRING
 * }
 */
function buildTimestampRequest(hash: Buffer, nonce: Buffer): Buffer {
  // AlgorithmIdentifier per SHA-256: OID 2.16.840.1.101.3.4.2.1
  const sha256Oid = Buffer.from([0x30, 0x0d, 0x06, 0x09, 0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04, 0x02, 0x01, 0x05, 0x00])

  // OCTET STRING wrapping the hash
  const hashLen = hash.length
  const octetString = Buffer.concat([
    Buffer.from([0x04, hashLen]),
    hash
  ])

  // messageImprint: SEQUENCE { AlgorithmIdentifier, OCTET STRING }
  const imprintLen = sha256Oid.length + octetString.length
  const messageImprint = Buffer.concat([
    Buffer.from([0x30, imprintLen]),
    sha256Oid,
    octetString
  ])

  // nonce: INTEGER
  const nonceInt = Buffer.concat([
    Buffer.from([0x02, nonce.length]),
    nonce
  ])

  // certReq: BOOLEAN FALSE = DEFAULT (omesso)

  // TimeStampReq: SEQUENCE { version(1), messageImprint, nonce }
  const version = Buffer.from([0x02, 0x01, 0x01]) // INTEGER 1
  const innerLen = version.length + messageImprint.length + nonceInt.length
  const tsReq = Buffer.concat([
    Buffer.from([0x30, innerLen]),
    version,
    messageImprint,
    nonceInt
  ])

  return tsReq
}

/**
 * Verifica che un timestamp token sia valido (controllo di base).
 * Per verifica completa serve una libreria ASN.1 certificata.
 */
export function verifyTimestampToken(token: string): boolean {
  try {
    const buffer = Buffer.from(token, "base64")
    // Verifica minima: il token deve essere un SEQUENCE ASN.1 valido
    if (buffer.length < 10) return false
    if (buffer[0] !== 0x30) return false // Deve iniziare con SEQUENCE
    return true
  } catch {
    return false
  }
}

/**
 * Restituisce true se il timestamp è configurato.
 */
export function isTimestampAvailable(): boolean {
  return !!TSA_URL
}
