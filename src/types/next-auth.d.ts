import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface User {
    id: string
    role: string
    matricola: string
    qualifica?: string | null
    forcePasswordChange: boolean
    tenantId?: string | null
    tenantName?: string | null
    tenantSlug?: string | null
    tenantLogo?: string | null
    tenantPrimaryColor?: string | null
    isSuperAdmin: boolean
    canManageShifts: boolean
    canManageUsers: boolean
    canVerifyClockIns: boolean
    canConfigureSystem: boolean
    gpsConsent: boolean
    privacyConsent: boolean
    twoFactorEnabled: boolean
    twoFactorVerified: boolean
    privacyAcceptedAt: Date | null
    gpsAcceptedAt: Date | null
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
    qualifica?: string | null
    forcePasswordChange: boolean
    tenantId: string | null
    tenantName: string | null
    tenantSlug: string | null
    tenantLogo: string | null
    tenantPrimaryColor: string | null
    isSuperAdmin: boolean
    canManageShifts: boolean
    canManageUsers: boolean
    canVerifyClockIns: boolean
    canConfigureSystem: boolean
    gpsConsent: boolean
    privacyConsent: boolean
    twoFactorEnabled: boolean
    twoFactorVerified: boolean
    privacyAcceptedAt: Date | null
    gpsAcceptedAt: Date | null
  }
}
