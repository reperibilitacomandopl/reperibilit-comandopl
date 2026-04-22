import { auth } from "@/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// ============================================================================
// MIDDLEWARE DI SICUREZZA CENTRALIZZATO
// Protegge automaticamente tutte le route che richiedono autenticazione.
// Le route pubbliche sono esplicitamente elencate nella whitelist.
// ============================================================================

/** Route che NON richiedono autenticazione */
const PUBLIC_ROUTES = [
  "/login",
  "/policy",
  "/terms",
  "/faq",
  "/verify",
  "/api/auth",           // NextAuth endpoints
  "/api/cron",           // Vercel cron (protetto dal CRON_SECRET)
  "/api/telegram/webhook", // Telegram webhook (protetto dal token)
  "/api/test-db",        // Health check
]

/** Route che richiedono ruolo ADMIN o permessi specifici */
const ADMIN_ROUTES = [
  "/api/admin",
  "/admin",
]

/** Route che richiedono SuperAdmin */
const SUPERADMIN_ROUTES = [
  "/api/superadmin",
  "/superadmin",
]

function isPublicRoute(pathname: string): boolean {
  // La homepage ("/") è pubblica (landing page)
  if (pathname === "/") return true
  
  // Risorse statiche e manifest
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/sw.") ||
    pathname.startsWith("/workbox") ||
    pathname.startsWith("/worker") ||
    pathname.startsWith("/swe-worker") ||
    pathname.endsWith(".js") ||
    pathname.endsWith(".css") ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".webp") ||
    pathname.endsWith(".json") ||
    pathname === "/manifest.webmanifest"
  ) {
    return true
  }

  return PUBLIC_ROUTES.some(route => pathname.startsWith(route))
}

function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTES.some(route => pathname.includes(route))
}

function isSuperAdminRoute(pathname: string): boolean {
  return SUPERADMIN_ROUTES.some(route => pathname.includes(route))
}

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // 1. Route pubbliche: lascia passare
  if (isPublicRoute(pathname)) {
    return addSecurityHeaders(NextResponse.next(), true)
  }

  // 2. Utenti non autenticati: redirect al login
  if (!session?.user) {
    // Per le API, restituisci 401 JSON
    if (pathname.startsWith("/api/")) {
      return addSecurityHeaders(
        NextResponse.json(
          { error: "Non autenticato. Effettua il login." },
          { status: 401 }
        )
      )
    }
    // Per le pagine, redirect al login
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 3. Route SuperAdmin: verifica isSuperAdmin
  if (isSuperAdminRoute(pathname)) {
    if (!session.user.isSuperAdmin) {
      if (pathname.startsWith("/api/")) {
        return addSecurityHeaders(
          NextResponse.json(
            { error: "Accesso riservato al SuperAdmin." },
            { status: 403 }
          )
        )
      }
      return NextResponse.redirect(new URL("/login", req.url))
    }
  }

  // 4. Route Admin: verifica ruolo ADMIN o permessi granulari
  if (isAdminRoute(pathname)) {
    const hasAdminAccess =
      session.user.role === "ADMIN" ||
      session.user.isSuperAdmin ||
      session.user.canManageShifts ||
      session.user.canManageUsers ||
      session.user.canVerifyClockIns ||
      session.user.canConfigureSystem

    if (!hasAdminAccess) {
      if (pathname.startsWith("/api/")) {
        return addSecurityHeaders(
          NextResponse.json(
            { error: "Non hai i permessi per accedere a questa risorsa." },
            { status: 403 }
          )
        )
      }
      return NextResponse.redirect(new URL("/login", req.url))
    }
  }

  // 5. Utente autenticato, route valida: lascia passare
  return addSecurityHeaders(NextResponse.next())
})

/**
 * Aggiunge header di sicurezza a tutte le risposte.
 * CSP (Content Security Policy) è il principale header anti-XSS.
 */
function addSecurityHeaders(response: NextResponse, isPublic: boolean = false): NextResponse {
  // Content Security Policy — restringe le origini dei contenuti caricabili
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      // Script: self + inline necessari per Next.js + eval per dev mode
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com",
      // Stili: self + inline (necessari per Tailwind e styled-jsx)
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Font: self + Google Fonts
      "font-src 'self' https://fonts.gstatic.com data:",
      // Immagini: self + data URI + blob (per QR code) + qualsiasi HTTPS
      "img-src 'self' data: blob: https:",
      // Connessioni API: self + Supabase + Telegram
      "connect-src 'self' https://*.supabase.co https://api.telegram.org wss://*.supabase.co",
      // Frame: nessuno (già gestito da X-Frame-Options: DENY)
      "frame-ancestors 'none'",
      // Base: self
      "base-uri 'self'",
      // Form: self
      "form-action 'self'",
      // Worker: self + blob (per service worker PWA)
      "worker-src 'self' blob:",
    ].join("; ")
  )

  // Previene il caching delle pagine protette per garantire che il logout sia immediato 
  // e che premendo "Indietro" non si vedano dati sensibili.
  if (!isPublic) {
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
    response.headers.set("Pragma", "no-cache")
    response.headers.set("Expires", "0")
  }

  // Previene il MIME-type sniffing
  response.headers.set("X-Content-Type-Options", "nosniff")

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
