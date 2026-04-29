import { auth } from "@/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// ============================================================================
// MIDDLEWARE DI SICUREZZA CENTRALIZZATO
// Protegge automaticamente tutte le route che richiedono autenticazione.
// Le route pubbliche sono esplicitamente elencate nella whitelist.
// ============================================================================

/** Route che NON richiedono autenticazione */
const PUBLIC_ROUTES = new Set([
  "/login",
  "/policy",
  "/terms",
  "/faq",
  "/verify",
])

const PUBLIC_PREFIXES = [
  "/api/auth",
  "/api/cron",
  "/api/telegram/webhook",
  "/api/test-db",
  "/api/calendar",
  "/api/demo-request",
]

function isPublicRoute(pathname: string): boolean {
  if (pathname === "/") return true
  if (PUBLIC_ROUTES.has(pathname)) return true
  
  // Risorse statiche
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/sw.") ||
    pathname.startsWith("/workbox") ||
    pathname.startsWith("/worker") ||
    pathname.startsWith("/swe-worker") ||
    pathname.match(/\.(js|css|ico|png|jpg|svg|webp|json|webmanifest)$/)
  ) {
    return true
  }

  return PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix))
}

function isAdminRoute(pathname: string): boolean {
  return pathname.includes("/admin") || pathname.includes("/api/admin")
}

function isSuperAdminRoute(pathname: string): boolean {
  return pathname.includes("/superadmin") || pathname.includes("/api/superadmin")
}

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth
  const isPublic = isPublicRoute(pathname)

  // 1. Route pubbliche: lascia passare
  if (isPublic) {
    return addSecurityHeaders(NextResponse.next(), true)
  }

  // 2. Utenti non autenticati: redirect al login
  if (!session?.user) {
    if (pathname.startsWith("/api/")) {
      return addSecurityHeaders(
        NextResponse.json(
          { error: "Non autenticato. Effettua il login." },
          { status: 401 }
        )
      )
    }
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 3. Route SuperAdmin
  if (isSuperAdminRoute(pathname)) {
    if (!session.user.isSuperAdmin) {
      if (pathname.startsWith("/api/")) {
        return addSecurityHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }))
      }
      return NextResponse.redirect(new URL("/login", req.url))
    }
  }

  // 4. Route Admin
  if (isAdminRoute(pathname)) {
    const u = session.user
    const hasAdminAccess =
      u.role === "ADMIN" ||
      u.isSuperAdmin ||
      u.canManageShifts ||
      u.canManageUsers ||
      u.canVerifyClockIns ||
      u.canConfigureSystem

    if (!hasAdminAccess) {
      if (pathname.startsWith("/api/")) {
        return addSecurityHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }))
      }
      return NextResponse.redirect(new URL("/login", req.url))
    }

    // Protezione granulare
    if (!u.isSuperAdmin && u.role !== "ADMIN") {
      const isShiftRoute = pathname.includes("/ods") || pathname.includes("/stampa-ods") || pathname.includes("/auto-compila") || pathname.includes("/bacheca-scambi") || pathname.includes("/sala-operativa")
      const isUserRoute = pathname.includes("/risorse") || pathname.includes("/richieste") || pathname.includes("/formazione")
      const isClockRoute = pathname.includes("/timbrature")
      const isSystemRoute = pathname.includes("/impostazioni") || pathname.includes("/sezioni") || pathname.includes("/parco-auto") || pathname.includes("/audit-logs") || pathname.includes("/straordinari") || pathname.includes("/report") || pathname.includes("/export-paghe")

      let allowed = true
      if (isShiftRoute && !u.canManageShifts) allowed = false
      if (isUserRoute && !u.canManageUsers) allowed = false
      if (isClockRoute && !u.canVerifyClockIns) allowed = false
      if (isSystemRoute && !u.canConfigureSystem) allowed = false

      if (!allowed) {
        const tenantSlug = pathname.split("/")[1]
        return NextResponse.redirect(new URL(`/${tenantSlug}/admin/pannello`, req.url))
      }
    }
  }

  return addSecurityHeaders(NextResponse.next())
})

/**
 * Aggiunge header di sicurezza a tutte le risposte.
 */
function addSecurityHeaders(response: NextResponse, isPublic: boolean = false): NextResponse {
  // Content Security Policy
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://*.tile.openstreetmap.org;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com;
    img-src 'self' data: https://*.tile.openstreetmap.org https://unpkg.com https://*.googleusercontent.com https://raw.githubusercontent.com;
    font-src 'self' https://fonts.gstatic.com;
    connect-src 'self' https://api.telegram.org https://*.tile.openstreetmap.org;
    frame-ancestors 'none';
    form-action 'self';
  `.replace(/\s{2,}/g, ' ').trim()

  response.headers.set("Content-Security-Policy", cspHeader)
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)")

  if (!isPublic) {
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
    response.headers.set("Pragma", "no-cache")
    response.headers.set("Expires", "0")
  }

  return response
}

// Matcher: applica il middleware a tutte le route tranne i file statici di Next
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (meta files)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
}
