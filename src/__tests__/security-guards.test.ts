import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { verifyIntegrationApiKey } from "@/lib/integration-api-key"

describe("verifyIntegrationApiKey", () => {
  const env = process.env

  beforeEach(() => {
    process.env = { ...env }
    delete process.env.VERBATEL_API_KEY
    delete process.env.AUTH_SECRET
  })

  afterEach(() => {
    process.env = env
  })

  it("rifiuta chiave vuota", () => {
    expect(verifyIntegrationApiKey(null)).toBe(false)
    expect(verifyIntegrationApiKey("")).toBe(false)
  })

  it("accetta VERBATEL_API_KEY quando configurata", () => {
    process.env.VERBATEL_API_KEY = "test-verbatel-key"
    expect(verifyIntegrationApiKey("test-verbatel-key")).toBe(true)
    expect(verifyIntegrationApiKey("wrong")).toBe(false)
  })

  it("non accetta AUTH_SECRET se VERBATEL_API_KEY è impostata", () => {
    process.env.VERBATEL_API_KEY = "dedicated"
    process.env.AUTH_SECRET = "legacy"
    expect(verifyIntegrationApiKey("legacy")).toBe(false)
    expect(verifyIntegrationApiKey("dedicated")).toBe(true)
  })
})

describe("blockInProduction", () => {
  it("restituisce 404 in produzione", async () => {
    const prev = process.env.NODE_ENV
    process.env.NODE_ENV = "production"
    const { blockInProduction } = await import("@/lib/dev-only")
    const res = blockInProduction()
    expect(res?.status).toBe(404)
    process.env.NODE_ENV = prev
  })
})
