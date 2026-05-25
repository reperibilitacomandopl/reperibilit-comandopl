import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { checkRateLimit } from "@/lib/rate-limit"
import { logAudit, AUDIT_ACTIONS } from "@/lib/audit"
import { cookies } from "next/headers"

// C2 FIX: Funzione per generare e verificare il token di prova 2FA
const TWO_FA_HMAC_KEY = process.env.AUTH_SECRET || "fallback-secret"

export function generate2FAProof(userId: string): string {
  const payload = `${userId}:${Math.floor(Date.now() / 1000)}`
  const sig = crypto.createHmac("sha256", TWO_FA_HMAC_KEY).update(payload).digest("hex")
  return `${payload}:${sig}`
}

export function verify2FAProof(proof: string, userId: string): boolean {
  try {
    const parts = proof.split(":")
    if (parts.length !== 3) return false
    const [proofUserId, timestampStr, signature] = parts
    if (proofUserId !== userId) return false
    // Proof valida per max 5 minuti
    const timestamp = parseInt(timestampStr)
    if (Math.floor(Date.now() / 1000) - timestamp > 300) return false
    const expectedSig = crypto.createHmac("sha256", TWO_FA_HMAC_KEY).update(`${proofUserId}:${timestampStr}`).digest("hex")
    return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expectedSig, "hex"))
  } catch {
    return false
  }
}

const HCAPTCHA_SECRET = process.env.HCAPTCHA_SECRET_KEY
const HCAPTCHA_VERIFY_URL = "https://hcaptcha.com/siteverify"

function toConsentIso(v: unknown): string | null {
  if (v == null) return null
  if (typeof v === "string") return v
  return new Date(v as string | number).toISOString()
}

async function verifyHCaptcha(token: string): Promise<boolean> {
  if (!HCAPTCHA_SECRET) {
    if (process.env.NODE_ENV === "production") {
      console.error("[AUTH] HCAPTCHA_SECRET_KEY mancante in produzione")
      return false
    }
    return true // Solo sviluppo locale senza captcha configurato
  }
  if (!token) return false
  try {
    const res = await fetch(HCAPTCHA_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${encodeURIComponent(HCAPTCHA_SECRET)}&response=${encodeURIComponent(token)}`
    })
    const data = await res.json()
    return data.success === true
  } catch {
    return false
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    // === PREDISPOSIZIONE SPID/CIE (OIDC) ===
    ...(process.env.SPID_ISSUER ? [{
      id: "spid",
      name: "SPID",
      type: "oidc" as const,
      issuer: process.env.SPID_ISSUER,
      clientId: process.env.SPID_CLIENT_ID,
      clientSecret: process.env.SPID_CLIENT_SECRET,
      authorization: { params: { scope: "openid profile email" } },
      wellKnown: process.env.SPID_WELL_KNOWN,
    }] : []),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        tenantSlug: { label: "Codice Comando", type: "text" },
        matricola: { label: "Matricola", type: "text" },
        password: { label: "Password", type: "password" },
        captchaToken: { label: "hCaptcha Token", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.matricola || !credentials?.password || !credentials?.tenantSlug) {
          return null
        }

        const limitKey = `login-${credentials.tenantSlug}-${credentials.matricola}`
        if (!(await checkRateLimit(limitKey, 5, 60000))) {
          throw new Error("Troppi tentativi di accesso. Riprova tra un minuto.")
        }

        // hCaptcha: validazione se il token è presente
        const captchaToken = (credentials as any).captchaToken as string | undefined
        if (captchaToken) {
          const captchaValid = await verifyHCaptcha(captchaToken)
          if (!captchaValid) {
            throw new Error("Verifica di sicurezza fallita. Riprova.")
          }
        }

        // 1. Trova il Tenant per slug
        const tenant = await prisma.tenant.findUnique({
          where: { slug: (credentials.tenantSlug as string).toLowerCase() }
        })

        if (!tenant || !tenant.isActive) {
          throw new Error("Comando non trovato o non attivo")
        }

        // 2. Trova l'utente per matricola ALL'INTERNO del tenant
        const user = await prisma.user.findFirst({
          where: { 
            matricola: credentials.matricola as string,
            tenantId: tenant.id,
            isActive: true
          }
        })

        if (!user) {
          await logAudit({
            tenantId: tenant.id,
            adminId: "SYSTEM",
            adminName: credentials.matricola as string,
            action: AUDIT_ACTIONS.LOGIN_FAILED,
            details: `Tentativo di accesso fallito: matricola non trovata`
          })
          return null
        }

        // --- ACCOUNT LOCKOUT CHECK ---
        if (user.lockoutUntil && user.lockoutUntil > new Date()) {
          const diff = Math.ceil((user.lockoutUntil.getTime() - Date.now()) / 60000)
          const reason = user.lockoutReason || "troppi tentativi falliti"
          throw new Error(`Account temporaneamente bloccato per ${reason}. Riprova tra ${diff} minuti.`)
        }

        // --- PERMANENT LOCKOUT (20+ tentativi) ---
        if ((user.failedLoginAttempts || 0) >= 20 && !user.lockoutUntil) {
          throw new Error("Account bloccato per sicurezza. Contatta l'amministratore per lo sblocco.")
        }

        const isValid = await bcrypt.compare(credentials.password as string, user.password)

        if (!isValid) {
          const newAttempts = (user.failedLoginAttempts || 0) + 1
          let lockoutUntil: Date | null = null
          let lockoutReason: string | null = null

          // Lockout progressivo a 3 livelli
          if (newAttempts >= 20) {
            lockoutUntil = null // blocco permanente (segnalato da failedAttempts >= 20 + lockoutUntil = null)
            lockoutReason = "blocco permanente per sicurezza (20+ tentativi)"
          } else if (newAttempts >= 10) {
            lockoutUntil = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 ore
            lockoutReason = "blocco 24 ore (10+ tentativi)"
          } else if (newAttempts >= 5) {
            lockoutUntil = new Date(Date.now() + 15 * 60 * 1000) // 15 minuti
            lockoutReason = "blocco 15 minuti (5+ tentativi)"
          }

          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: newAttempts,
              lockoutUntil,
              lockoutReason
            }
          })

          await logAudit({
            tenantId: tenant.id,
            adminId: user.id,
            adminName: user.name,
            action: AUDIT_ACTIONS.LOGIN_FAILED,
            details: `Login fallito: password errata. Tentativi: ${newAttempts}. ${lockoutReason ? `Azione: ${lockoutReason}.` : ""}`
          })

          // Notifica admin su lockout
          if (lockoutReason) {
            try {
              const { notifyAdminActivity } = await import("@/lib/telegram")
              await notifyAdminActivity(
                `🔒 <b>Account Bloccato</b>\n\nAgente: ${user.name} (${user.matricola})\nMotivo: ${lockoutReason}\nTentativi falliti: ${newAttempts}`,
                tenant.id
              )
            } catch (_) { /* non blocchiamo il login se Telegram fallisce */ }
          }

          if (newAttempts >= 20) {
            throw new Error("Account bloccato per sicurezza. Contatta l'amministratore per lo sblocco.")
          }
          if (newAttempts >= 5) {
            const min = newAttempts >= 10 ? 1440 : 15
            throw new Error(`Account bloccato per ${min} minuti causa eccessivi tentativi falliti.`)
          }
          return null
        }

        // Login riuscito: resetta contatori e lockout
        if (user.failedLoginAttempts > 0 || user.lockoutUntil || user.lockoutReason) {
          await prisma.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: 0, lockoutUntil: null, lockoutReason: null }
          })
        }

        const tenantName = tenant.name
        const tenantSlug = tenant.slug

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          matricola: user.matricola,
          qualifica: user.qualifica,
          forcePasswordChange: user.forcePasswordChange,
          tenantId: user.tenantId || undefined,
          tenantName: tenantName,
          tenantSlug: tenantSlug,
          tenantLogo: tenant.logoUrl,
          tenantPrimaryColor: tenant.primaryColor,
          isSuperAdmin: user.isSuperAdmin,
          canManageShifts: user.canManageShifts,
          canManageUsers: user.canManageUsers,
          canVerifyClockIns: user.canVerifyClockIns,
          canConfigureSystem: user.canConfigureSystem,
          gpsConsent: user.gpsConsent,
          privacyConsent: user.privacyConsent,
          twoFactorEnabled: user.twoFactorEnabled,
          twoFactorVerified: false,
          trustedIps: user.trustedIps || [],
          privacyAcceptedAt: toConsentIso(user.privacyAcceptedAt),
          gpsAcceptedAt: toConsentIso(user.gpsAcceptedAt),
          squadra: user.squadra,
          isUfficiale: user.isUfficiale
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        // Clear impersonation on fresh login
        try {
          const cookieStore = await cookies()
          cookieStore.delete("superadmin_impersonate")
        } catch (e) {
          console.error("Could not delete impersonate cookie on login", e)
        }
        
        token.id = user.id
        token.role = user.role as string
        token.matricola = user.matricola as string
        token.qualifica = (user as any).qualifica as string | undefined
        token.forcePasswordChange = user.forcePasswordChange as boolean
        token.tenantId = (user as any).tenantId as string | undefined
        token.tenantName = (user as any).tenantName as string | undefined
        token.tenantSlug = (user as any).tenantSlug as string | undefined
        token.tenantLogo = (user as any).tenantLogo as string | undefined
        token.tenantPrimaryColor = (user as any).tenantPrimaryColor as string | undefined
        token.isSuperAdmin = (user as any).isSuperAdmin as boolean | undefined
        token.canManageShifts = (user as any).canManageShifts as boolean | undefined
        token.canManageUsers = (user as any).canManageUsers as boolean | undefined
        token.canVerifyClockIns = (user as any).canVerifyClockIns as boolean | undefined
        token.canConfigureSystem = (user as any).canConfigureSystem as boolean | undefined
        token.gpsConsent = (user as any).gpsConsent as boolean | undefined
        token.privacyConsent = (user as any).privacyConsent as boolean | undefined
        token.twoFactorEnabled = (user as any).twoFactorEnabled as boolean | undefined
        token.twoFactorVerified = false
        token.trustedIps = (user as any).trustedIps as string[] | undefined
        token.privacyAcceptedAt = toConsentIso((user as any).privacyAcceptedAt)
        token.gpsAcceptedAt = toConsentIso((user as any).gpsAcceptedAt)
        token.squadra = (user as any).squadra as string | undefined
        token.isUfficiale = (user as any).isUfficiale as boolean | undefined
      }

      if (trigger === "update") {
        if (session?.twoFactorEnabled !== undefined) token.twoFactorEnabled = session.twoFactorEnabled
        // C2 FIX: Non fidarsi di twoFactorVerified dal client — verificare la prova HMAC firmata server-side
        if (session?.twoFactorVerified && session?.twoFactorProof) {
          const isProofValid = verify2FAProof(session.twoFactorProof as string, token.id as string)
          if (isProofValid) {
            token.twoFactorVerified = true
          }
          // Se la prova non è valida, ignoriamo silenziosamente la richiesta di bypass
        }
        if (session?.privacyAcceptedAt) token.privacyAcceptedAt = session.privacyAcceptedAt
        if (session?.gpsAcceptedAt) token.gpsAcceptedAt = session.gpsAcceptedAt
        if (session?.gpsConsent !== undefined) token.gpsConsent = session.gpsConsent
        if (session?.privacyConsent !== undefined) token.privacyConsent = session.privacyConsent
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) || (token.sub as string)
        session.user.role = token.role as string
        session.user.matricola = token.matricola as string
        session.user.qualifica = token.qualifica as string | undefined
        session.user.forcePasswordChange = token.forcePasswordChange as boolean
        session.user.isSuperAdmin = (token.isSuperAdmin as boolean) || false
        session.user.tenantId = token.tenantId as string
        session.user.tenantName = token.tenantName as string
        session.user.tenantSlug = token.tenantSlug as string
        session.user.tenantLogo = token.tenantLogo as string
        session.user.tenantPrimaryColor = token.tenantPrimaryColor as string
        session.user.canManageShifts = token.canManageShifts as boolean
        session.user.canManageUsers = token.canManageUsers as boolean
        session.user.canVerifyClockIns = token.canVerifyClockIns as boolean
        session.user.canConfigureSystem = token.canConfigureSystem as boolean
        session.user.gpsConsent = token.gpsConsent as boolean
        session.user.privacyConsent = token.privacyConsent as boolean
        session.user.twoFactorEnabled = token.twoFactorEnabled as boolean
        session.user.twoFactorVerified = token.twoFactorVerified as boolean
        session.user.trustedIps = (token.trustedIps as string[]) || []
        session.user.privacyAcceptedAt = toConsentIso(token.privacyAcceptedAt)
        session.user.gpsAcceptedAt = toConsentIso(token.gpsAcceptedAt)
        session.user.squadra = token.squadra as string | undefined
        session.user.isUfficiale = (token.isUfficiale as boolean) || false
        
        // Se è SuperAdmin, NON ci fidiamo della cache del token. Leggiamo SEMPRE il DB in tempo reale
        // per permettere allo switch (impersonification) di funzionare istantaneamente tramite cookie.
        // NOTA: Questo blocco viene saltato in Edge Runtime (Middleware) per evitare errori Prisma.
        if (session.user.isSuperAdmin && session.user.id && process.env.NEXT_RUNTIME !== 'edge') {
          try {
            const cookieStore = await cookies()
            const impersonatedId = cookieStore.get('superadmin_impersonate')?.value
            const dbUser = await prisma.user.findUnique({
              where: { id: session.user.id },
              select: { tenantId: true }
            })
            
            const targetTenantId = impersonatedId || dbUser?.tenantId || undefined
            
            // Sovrascriviamo SEMPRE i dati del tenant
            session.user.tenantId = targetTenantId
            if (targetTenantId) {
              const tenant = await prisma.tenant.findUnique({
                where: { id: targetTenantId },
                select: { name: true, slug: true, logoUrl: true, primaryColor: true }
              })
              session.user.tenantName = tenant?.name || null
              session.user.tenantSlug = tenant?.slug || null
              session.user.tenantLogo = tenant?.logoUrl || null
              session.user.tenantPrimaryColor = tenant?.primaryColor || null
            } else {
              session.user.tenantName = null
              session.user.tenantSlug = null
            }
          } catch (e) {
            console.error("Error fetching live tenantId for SuperAdmin:", e)
          }
        }
      }
      return session
    }
  },
  events: {
    async signIn({ user }) {
      if (user?.id) {
        await logAudit({
          tenantId: (user as any).tenantId || null,
          adminId: user.id,
          adminName: user.name || undefined,
          action: AUDIT_ACTIONS.LOGIN,
          details: `Accesso effettuato con successo`
        })
      }
    }
  },
  session: { 
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 giorni (mantiene l'accesso su smartphone)
  },
  pages: {
    signIn: '/login',
  }
})
