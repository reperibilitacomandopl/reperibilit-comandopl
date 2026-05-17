import { auth } from "@/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getGlobalLimiter, getBulkLimiter, getUserLimiter, getOdsLimiter, trackOperation } from "@/lib/rate-limit"

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
  "/api/debug",
  "/api/telegram/webhook",
  "/api/test-db",
  "/api/calendar",
  "/api/demo-request",
  "/api/health",
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

export default auth(async (req) => {
  const { pathname } = req.nextUrl
  const { method } = req
  const session = req.auth
  const isPublic = isPublicRoute(pathname)

  // --- GENERAZIONE REQUEST ID (Punto 6.5 Checklist) ---
  const requestId = crypto.randomUUID()
  req.headers.set("x-request-id", requestId)

  // --- RATE LIMITING GLOBALE (⚠ Critico) ---
  // Protezione contro DoS applicativo su operazioni di scrittura
  if (method !== "GET" && method !== "HEAD" && process.env.NODE_ENV === "production") {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1"
    
    // Usiamo il limiter globale (60 req/min) o bulk per operazioni massive
    const isBulk = req.nextUrl.pathname.includes("/import") || 
                   req.nextUrl.pathname.includes("/generate") || 
                   req.nextUrl.pathname.includes("/certify")
    
    const limiter = isBulk ? getBulkLimiter() : getGlobalLimiter()
    
    if (limiter) {
      const { success } = await limiter.limit(`global-write-${ip}`)
      if (!success) {
        return addSecurityHeaders(NextResponse.json({ error: "Too Many Requests", message: "Limite operativo superato. Riprova tra un minuto." }, { status: 429 }), false, requestId)
      }
    }
  }

  // 1. Route pubbliche: lascia passare
  if (isPublic) {
    return addSecurityHeaders(NextResponse.next(), true, requestId)
  }

  // 2. Utenti non autenticati: redirect al login
  if (!session?.user) {
    if (pathname.startsWith("/api/")) {
      return addSecurityHeaders(
        NextResponse.json(
          { error: "Non autenticato. Effettua il login." },
          { status: 401 }
        ),
        false,
        requestId
      )
    }
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  const u = session.user

  // 3. MFA SEIZURE & ENFORCEMENT (⚠ Critico)
  const currentIp = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1"
  const isIpTrusted = (u as any).trustedIps?.includes(currentIp)

  // Se l'MFA è attivo ma non verificato, blocca tutto tranne la pagina di verifica
  // SALTA il controllo se l'IP è già trusted
  if (u.twoFactorEnabled && !u.twoFactorVerified && !isIpTrusted && pathname !== "/verify-2fa") {
    if (pathname.startsWith("/api/")) {
      return addSecurityHeaders(NextResponse.json({ error: "MFA_REQUIRED", message: "Verifica 2FA richiesta" }, { status: 403 }), false, requestId)
    }
    return NextResponse.redirect(new URL("/verify-2fa", req.url))
  }

  // ENFORCEMENT: Se l'utente è un ADMIN ma non ha l'MFA attiva, forza il setup (Punto 2.4 Checklist)
  // SALTA se l'IP è già trusted (anche se improbabile qui, per coerenza)
  const securityPath = `/${u.tenantSlug}/admin/sicurezza`
  if (u.role === "ADMIN" && !u.twoFactorEnabled && !isIpTrusted && pathname !== securityPath && !pathname.startsWith("/api/")) {
    return addSecurityHeaders(NextResponse.redirect(new URL(securityPath + "?forceMFA=true", req.url)), false, requestId)
  }

  // 4. ISOLAMENTO MULTI-TENANT (⚠ Critico)
  // Verifica che lo slug nell'URL corrisponda al tenant dell'utente (o che sia un SuperAdmin autorizzato)
  const pathParts = pathname.split("/")
  const urlSlug = pathParts[1] // es: /altamura/admin -> 'altamura'

  const reservedPrefixes = ["api", "superadmin", "verify-2fa", "login", "_next", "favicon", "sw"]
  if (urlSlug && !reservedPrefixes.includes(urlSlug) && !PUBLIC_ROUTES.has("/" + urlSlug)) {
    // Se l'utente non è SuperAdmin e sta cercando di accedere a uno slug diverso dal suo
    if (!u.isSuperAdmin && u.tenantSlug !== urlSlug) {
      console.warn(`[SECURITY] Tentativo di accesso cross-tenant rilevato: User ${u.id} (${u.tenantSlug}) -> ${urlSlug}`)
      
      if (pathname.startsWith("/api/")) {
        return addSecurityHeaders(NextResponse.json({ error: "Forbidden: Tenant Isolation Violation" }, { status: 403 }), false, requestId)
      }
      // Per le rotte UI, riportalo al suo pannello
      return NextResponse.redirect(new URL(`/${u.tenantSlug}/admin/pannello`, req.url))
    }
  }

  // 4.5 — RATE LIMITING PER-UTENTE (autenticato)
  if (u.id && u.tenantId && process.env.NODE_ENV === "production") {
    const userId = u.id

    // Limite per GET autenticati (200 req/min per utente)
    if (method === "GET") {
      const userLimiter = getUserLimiter()
      if (userLimiter) {
        const { success } = await userLimiter.limit(`user-read-${userId}`)
        if (!success) {
          return addSecurityHeaders(
            NextResponse.json({ error: "Too Many Requests", message: "Limite richieste superato." }, { status: 429 }),
            false, requestId
          )
        }
      }
    }

    // Limite specifico per generazione OdS (10/ora per tenant)
    if (pathname.includes("/ods/generate") || pathname.includes("/certify")) {
      const odsLimiter = getOdsLimiter()
      if (odsLimiter) {
        const { success } = await odsLimiter.limit(`ods-generate-${u.tenantId}`)
        if (!success) {
          return addSecurityHeaders(
            NextResponse.json({ error: "Too Many Requests", message: "Limite generazione documenti superato. Riprova più tardi." }, { status: 429 }),
            false, requestId
          )
        }
      }
    }

    // Tracking operazioni per anomaly detection
    trackOperation(u.tenantId, pathname).catch(() => {})
  }

  // 5. Route SuperAdmin
  if (isSuperAdminRoute(pathname)) {
    if (!u.isSuperAdmin) {
      if (pathname.startsWith("/api/")) {
        return addSecurityHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }), false, requestId)
      }
      return NextResponse.redirect(new URL("/login", req.url))
    }
  }

  // 6. Route Admin
  if (isAdminRoute(pathname)) {
    const hasAdminAccess =
      u.role === "ADMIN" ||
      u.isSuperAdmin ||
      u.canManageShifts ||
      u.canManageUsers ||
      u.canVerifyClockIns ||
      u.canConfigureSystem

    if (!hasAdminAccess) {
      if (pathname.startsWith("/api/")) {
        return addSecurityHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }), false, requestId)
      }
      return NextResponse.redirect(new URL("/login", req.url))
    }

    // Protezione granulare per ruoli admin limitati
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
        return NextResponse.redirect(new URL(`/${u.tenantSlug}/admin/pannello`, req.url))
      }
    }
  }

  return addSecurityHeaders(NextResponse.next(), false, requestId)
})

/**
 * Aggiunge header di sicurezza a tutte le risposte.
 */
function addSecurityHeaders(response: NextResponse, isPublic: boolean = false, requestId?: string): NextResponse {
  // Content Security Policy
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://*.tile.openstreetmap.org;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com;
    img-src 'self' data: blob: https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com https://unpkg.com https://*.googleusercontent.com https://raw.githubusercontent.com https://upload.wikimedia.org;
    font-src 'self' https://fonts.gstatic.com;
    connect-src 'self' https://api.telegram.org https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com https://unpkg.com https://assets.mixkit.co;
    media-src 'self' https://assets.mixkit.co;
    frame-ancestors 'none';
    form-action 'self';
    base-uri 'self';
    object-src 'none';
  `.replace(/\s{2,}/g, ' ').trim()

  response.headers.set("Content-Security-Policy", cspHeader)
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)")
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
  
  if (requestId) {
    response.headers.set("x-request-id", requestId)
  }

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
