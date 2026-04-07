import NextAuth, { DefaultSession } from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      matricola: string;
      forcePasswordChange: boolean;
      tenantId: string;
      isSuperAdmin: boolean;
    } & DefaultSession["user"]
  }

  interface User {
    role: string;
    matricola: string;
    forcePasswordChange: boolean;
    tenantId?: string;
    isSuperAdmin?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    matricola?: string;
    forcePasswordChange?: boolean;
    tenantId?: string;
    isSuperAdmin?: boolean;
  }
}
