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
        matricola: { label: "Matricola", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.matricola || !credentials?.password) {
          return null
        }
        const user = await prisma.user.findUnique({
          where: { matricola: credentials.matricola as string }
        })
        if (!user) {
          return null
        }
        const isValid = await bcrypt.compare(credentials.password as string, user.password)
        if (!isValid) {
          return null
        }

        // Verifica che il tenant dell'utente sia attivo (se presente)
        if (user.tenantId) {
          const tenant = await prisma.tenant.findUnique({
            where: { id: user.tenantId }
          })
          if (tenant && !tenant.isActive) {
            return null // Tenant disattivato, blocca il login
          }
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          matricola: user.matricola,
          forcePasswordChange: user.forcePasswordChange,
          tenantId: user.tenantId || undefined,
          isSuperAdmin: user.isSuperAdmin
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role as string
        token.matricola = user.matricola as string
        token.forcePasswordChange = user.forcePasswordChange as boolean
        token.tenantId = (user as any).tenantId as string | undefined
        token.isSuperAdmin = (user as any).isSuperAdmin as boolean | undefined
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string
        session.user.matricola = token.matricola as string
        session.user.id = token.sub as string
        session.user.forcePasswordChange = token.forcePasswordChange as boolean
        session.user.tenantId = token.tenantId as string
        session.user.isSuperAdmin = (token.isSuperAdmin as boolean) || false
      }
      return session
    }
  },
  session: { strategy: "jwt" },
  pages: {
    signIn: '/login',
  }
})
