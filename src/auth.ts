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
            tenantId: tenant.id
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

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          matricola: user.matricola,
          forcePasswordChange: user.forcePasswordChange,
          tenantId: user.tenantId || undefined,
          tenantName: tenantName,
          isSuperAdmin: user.isSuperAdmin
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
        token.isSuperAdmin = (user as any).isSuperAdmin as boolean | undefined
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
        
        // Se è SuperAdmin, proviamo a recuperare il tenantId e tenantName in tempo reale
        if (session.user.isSuperAdmin && session.user.id) {
          try {
            const dbUser = await prisma.user.findUnique({
              where: { id: session.user.id },
              select: { tenantId: true }
            })
            session.user.tenantId = dbUser?.tenantId || null
            
            if (session.user.tenantId) {
              const tenant = await prisma.tenant.findUnique({
                where: { id: session.user.tenantId },
                select: { name: true }
              })
              session.user.tenantName = tenant?.name || null
            } else {
              session.user.tenantName = null
            }
          } catch (e) {
            console.error("Error fetching live tenantId for SuperAdmin:", e)
            session.user.tenantId = token.tenantId as string
            session.user.tenantName = token.tenantName as string
          }
        } else {
          session.user.tenantId = token.tenantId as string
          session.user.tenantName = token.tenantName as string
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
