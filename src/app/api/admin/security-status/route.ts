import { NextResponse } from "next/server"
import { auth } from "@/auth"

/**
 * GET /api/admin/security-status
 * Audit configurazione sicurezza (solo admin, nessun segreto in chiaro).
 */
export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const isAdmin =
    session.user.role === "ADMIN" ||
    session.user.isSuperAdmin === true ||
    session.user.canConfigureSystem === true
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const checks = {
    authSecret: !!process.env.AUTH_SECRET?.trim(),
    nextAuthSecret: !!process.env.NEXTAUTH_SECRET?.trim(),
    cronSecret: !!process.env.CRON_SECRET?.trim(),
    hcaptchaSecret: !!process.env.HCAPTCHA_SECRET_KEY?.trim(),
    hcaptchaSiteKey: !!process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY?.trim(),
    verbatelKey: !!process.env.VERBATEL_API_KEY?.trim(),
    vapidPublic: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim(),
    vapidPrivate: !!process.env.VAPID_PRIVATE_KEY?.trim(),
    storageSigning: !!process.env.STORAGE_SIGNING_SECRET?.trim(),
    nodeEnv: process.env.NODE_ENV || "development",
    debugBlocked: process.env.NODE_ENV === "production",
  }

  const required = [
    "authSecret",
    "cronSecret",
    "hcaptchaSecret",
    "verbatelKey",
    "vapidPublic",
    "vapidPrivate",
    "storageSigning",
  ] as const
  const missing = required.filter((k) => !checks[k])
  const ok = missing.length === 0 && checks.hcaptchaSiteKey

  return NextResponse.json({
    ok,
    missing,
    checks: {
      ...checks,
      hcaptchaSiteKey: checks.hcaptchaSiteKey,
    },
    hints:
      missing.length > 0
        ? "Completare ~/app/.env e ribuild Docker. Vedi docs/SEC-01_ROTazione_Segreti.md"
        : null,
  })
}
