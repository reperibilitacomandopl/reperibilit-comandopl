import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { checkRateLimit } from "@/lib/rate-limit"
import { logAudit, AUDIT_ACTIONS } from "@/lib/audit"
import { cookies } from "next/headers"

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
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.matricola || !credentials?.password || !credentials?.tenantSlug) {
          return null
        }

        const limitKey = `login-${credentials.tenantSlug}-${credentials.matricola}`
        if (!(await checkRateLimit(limitKey, 5, 60000))) {
          throw new Error("Troppi tentativi di accesso. Riprova tra un minuto.")
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
          throw new Error(`Account temporaneamente bloccato per troppi tentativi falliti. Riprova tra ${diff} minuti.`)
        }

        const isValid = await bcrypt.compare(credentials.password as string, user.password)
        
        if (!isValid) {
          // Incrementa tentativi falliti
          const newAttempts = (user.failedLoginAttempts || 0) + 1
          const lockoutUntil = newAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null
          
          await prisma.user.update({
            where: { id: user.id },
            data: { 
              failedLoginAttempts: newAttempts,
              lockoutUntil: lockoutUntil
            }
          })

          await logAudit({
            tenantId: tenant.id,
            adminId: user.id,
            adminName: user.name,
            action: AUDIT_ACTIONS.LOGIN_FAILED,
            details: `Tentativo di accesso fallito: password errata. Tentativi: ${newAttempts}/5`
          })
          
          if (newAttempts >= 5) {
            throw new Error("Account bloccato per 15 minuti causa eccessivi tentativi falliti.")
          }
          return null
        }

        // Login riuscito: resetta contatori
        if (user.failedLoginAttempts > 0 || user.lockoutUntil) {
          await prisma.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: 0, lockoutUntil: null }
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
          privacyAcceptedAt: user.privacyAcceptedAt,
          gpsAcceptedAt: user.gpsAcceptedAt,
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
        token.privacyAcceptedAt = (user as any).privacyAcceptedAt as Date | null | undefined
        token.gpsAcceptedAt = (user as any).gpsAcceptedAt as Date | null | undefined
        token.squadra = (user as any).squadra as string | undefined
        token.isUfficiale = (user as any).isUfficiale as boolean | undefined
      }

      if (trigger === "update") {
        if (session?.twoFactorEnabled !== undefined) token.twoFactorEnabled = session.twoFactorEnabled
        if (session?.twoFactorVerified) token.twoFactorVerified = true
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
        session.user.privacyAcceptedAt = token.privacyAcceptedAt as Date | null
        session.user.gpsAcceptedAt = token.gpsAcceptedAt as Date | null
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
    maxAge: 8 * 60 * 60, // 8 ore (durata media di un turno lavorativo)
  },
  pages: {
    signIn: '/login',
  }
})
