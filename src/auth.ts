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
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          matricola: user.matricola
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role as string
        token.matricola = user.matricola as string
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string
        session.user.matricola = token.matricola as string
        session.user.id = token.sub as string
      }
      return session
    }
  },
  session: { strategy: "jwt" },
  pages: {
    signIn: '/login',
  }
})
