import { auth } from "@/auth"

/**
 * Estrae il tenantId dalla sessione corrente.
 * Restituisce null se l'utente non è autenticato o non ha un tenant.
 * Usato da TUTTE le API per filtrare i dati per tenant.
 */
export async function getTenantId(): Promise<string | null> {
  const session = await auth()
  if (!session?.user) return null
  return session.user.tenantId || null
}

/**
 * Restituisce la sessione completa con tenantId verificato.
 * Lancia errore se l'utente non è autenticato.
 */
export async function getAuthenticatedSession() {
  const session = await auth()
  if (!session?.user) {
    throw new Error("Non autenticato")
  }
  return {
    user: session.user,
    tenantId: session.user.tenantId || null,
    isAdmin: session.user.role === "ADMIN",
    isSuperAdmin: session.user.isSuperAdmin || false
  }
}

/**
 * Filtro Prisma standard per isolamento Multi-Tenant.
 * Se l'utente è SuperAdmin, non filtra (vede tutto).
 * Altrimenti filtra per il tenantId dell'utente.
 */
export function tenantFilter(tenantId: string | null, isSuperAdmin: boolean = false) {
  if (isSuperAdmin) return {} // SuperAdmin vede tutto
  if (!tenantId) return { tenantId: null }
  return { tenantId }
}
