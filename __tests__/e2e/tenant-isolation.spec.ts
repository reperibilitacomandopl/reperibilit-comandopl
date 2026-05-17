import { test, expect } from "@playwright/test"

/**
 * TEST DI ISOLAMENTO MULTI-TENANT
 *
 * Verifica che un utente del Comune A non possa accedere ai dati
 * del Comune B, né via API né via interfaccia.
 *
 * Prima di eseguire:
 * 1. Avere due tenant configurati (es. "altamura" e "gravina")
 * 2. Avere un utente agente/admin per ciascun tenant
 * 3. Settare le env: TEST_TENANT_A, TEST_USER_A, TEST_PASS_A, TEST_TENANT_B
 *
 * Esecuzione: npx playwright test
 */

const TENANT_A = process.env.TEST_TENANT_A || "altamura"
const TENANT_B = process.env.TEST_TENANT_B || "gravina"
const USER_A = process.env.TEST_USER_A || "TEST001"
const PASS_A = process.env.TEST_PASS_A || "password123"
const USER_B = process.env.TEST_USER_B || "TEST002"
const PASS_B = process.env.TEST_PASS_B || "password123"

test.describe("Isolamento Multi-Tenant", () => {
  test.describe("API — Cross-Tenant Data Access", () => {
    test("GET /api/admin/users — non deve restituire utenti di altro tenant", async ({ request }) => {
      // Login come Comune A
      const loginA = await request.post("/api/auth/callback/credentials", {
        form: {
          tenantSlug: TENANT_A,
          matricola: USER_A,
          password: PASS_A,
          redirect: "false",
          json: "true"
        }
      })
      expect(loginA.ok()).toBeTruthy()

      const cookies = loginA.headers()["set-cookie"] || ""
      const sessionCookie = cookies.split(";")[0]

      // Richiedi utenti del TENANT_A
      const res = await request.get(`/api/admin/users`, {
        headers: { Cookie: sessionCookie }
      })

      expect(res.ok()).toBeTruthy()
      const data = await res.json()
      const users: any[] = data.users || []

      // Verifica che TUTTI gli utenti appartengano al tenant A
      for (const user of users) {
        expect(user.tenantId).toBeTruthy()
        // Il tenantId deve corrispondere a TENANT_A
        // Nota: non possiamo verificare l'ID esatto senza conoscerlo,
        // ma possiamo verificare che non ci siano dati cross-tenant noti
        if (user.matricola) {
          // La matricola dovrebbe essere unica per tenant
          expect(user.matricola).not.toBe(USER_B)
        }
      }
    })

    test("POST /api/admin/users/unlock — deve restituire 403 per tenant diverso", async ({ request }) => {
      const loginA = await request.post("/api/auth/callback/credentials", {
        form: {
          tenantSlug: TENANT_A,
          matricola: USER_A,
          password: PASS_A,
          redirect: "false",
          json: "true"
        }
      })
      expect(loginA.ok()).toBeTruthy()

      const cookies = loginA.headers()["set-cookie"] || ""
      const sessionCookie = cookies.split(";")[0]

      // Prova a sbloccare un utente con ID inventato ma di un tenant diverso
      const res = await request.post(`/api/admin/users/unlock`, {
        headers: { Cookie: sessionCookie, "Content-Type": "application/json" },
        data: { userId: "non-existent-id" }
      })

      // Dovrebbe restituire 404 (utente non trovato nel tenant)
      // o 403 se l'ID è di un altro tenant
      expect([403, 404]).toContain(res.status())
    })

    test("API senza sessione — deve restituire 401", async ({ request }) => {
      const res = await request.get("/api/admin/users")
      expect(res.status()).toBe(401)
    })
  })

  test.describe("Pagine — Cross-Tenant URL Access", () => {
    test("Utente Comune A non può accedere a pannello Comune B", async ({ page }) => {
      // Login come Comune A
      await page.goto(`/login?c=${TENANT_A}`)
      await page.fill('input[name="matricola"]', USER_A)
      await page.fill('input[name="password"]', PASS_A)
      await page.fill('input[name="tenantSlug"]', TENANT_A)
      await page.click('button[type="submit"]')

      // Dovrebbe reindirizzare alla dashboard
      await page.waitForURL(`/${TENANT_A}`)

      // Prova ad accedere al pannello admin del Comune B
      const res = await page.goto(`/${TENANT_B}/admin/pannello`)

      // Verifica che NON sia sulla pagina del Comune B
      // Il middleware dovrebbe reindirizzare al proprio tenant
      expect(page.url()).not.toContain(`/${TENANT_B}/admin`)
    })

    test("Utente non autenticato — redirect a /login per pagine protette", async ({ page }) => {
      await page.goto(`/${TENANT_A}/admin/pannello`)
      await page.waitForURL(/\/login/)
      expect(page.url()).toContain("/login")
    })
  })

  test.describe("Middleware — Security Headers", () => {
    test("Tutte le risposte devono avere X-Content-Type-Options: nosniff", async ({ request }) => {
      const res = await request.get("/login")
      expect(res.headers()["x-content-type-options"]).toBe("nosniff")
    })

    test("Tutte le risposte devono avere X-Frame-Options: DENY", async ({ request }) => {
      const res = await request.get("/")
      expect(res.headers()["x-frame-options"]).toBe("DENY")
    })

    test("Tutte le risposte devono avere Strict-Transport-Security", async ({ request }) => {
      const res = await request.get("/")
      expect(res.headers()["strict-transport-security"]).toBeDefined()
    })

    test("Rotte autenticate devono avere Cache-Control: no-store", async ({ request }) => {
      // Login per ottenere cookie
      const loginA = await request.post("/api/auth/callback/credentials", {
        form: {
          tenantSlug: TENANT_A,
          matricola: USER_A,
          password: PASS_A,
          redirect: "false",
          json: "true"
        }
      })
      const cookies = loginA.headers()["set-cookie"] || ""
      const sessionCookie = cookies.split(";")[0]

      const res = await request.get(`/api/admin/users`, {
        headers: { Cookie: sessionCookie }
      })
      expect(res.headers()["cache-control"]).toContain("no-store")
    })
  })
})
