// @ts-nocheck
import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
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
          return null
        }
        const isValid = await bcrypt.compare(credentials.password as string, user.password)
        if (!isValid) {
          return null
        }

        const tenantName = tenant.name
        const tenantSlug = tenant.slug

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          matricola: user.matricola,
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
          canConfigureSystem: user.canConfigureSystem
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.role = user.role as string
        token.matricola = user.matricola as string
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
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) || (token.sub as string)
        session.user.role = token.role as string
        session.user.matricola = token.matricola as string
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
        
        // Se è SuperAdmin e non ha un tenantId in sessione, proviamo a recuperarlo
        if (session.user.isSuperAdmin && !session.user.tenantId && session.user.id) {
          try {
            const dbUser = await prisma.user.findUnique({
              where: { id: session.user.id },
              select: { tenantId: true }
            })
            if (dbUser?.tenantId) {
              session.user.tenantId = dbUser.tenantId
              const tenant = await prisma.tenant.findUnique({
                where: { id: dbUser.tenantId },
                select: { name: true, slug: true }
              })
              session.user.tenantName = tenant?.name || null
              session.user.tenantSlug = tenant?.slug || null
              session.user.tenantLogo = tenant?.logoUrl || null
              session.user.tenantPrimaryColor = tenant?.primaryColor || null
            }
          } catch (e) {
            console.error("Error fetching live tenantId for SuperAdmin:", e)
          }
        }
      }
      return session
    }
  },
  session: { strategy: "jwt" },
  pages: {
    signIn: '/login',
  }
})
