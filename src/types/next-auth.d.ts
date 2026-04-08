import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface User {
    id: string
    role: string
    matricola: string
    forcePasswordChange: boolean
    tenantId?: string | null
    tenantName?: string | null
    tenantSlug?: string | null
    isSuperAdmin: boolean
    canManageShifts: boolean
    canManageUsers: boolean
    canVerifyClockIns: boolean
    canConfigureSystem: boolean
  }

  interface Session {
    user: User & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: string
    matricola: string
    forcePasswordChange: boolean
    tenantId: string | null
    tenantName: string | null
    tenantSlug: string | null
    isSuperAdmin: boolean
    canManageShifts: boolean
    canManageUsers: boolean
    canVerifyClockIns: boolean
    canConfigureSystem: boolean
  }
}
