import { describe, it, expect } from "vitest"
import { tenantFilter } from "@/lib/tenant"

describe("tenantFilter", () => {
  it("filtra per tenantId per utenti normali", () => {
    expect(tenantFilter("tenant-abc", false)).toEqual({ tenantId: "tenant-abc" })
  })

  it("super admin non applica filtro", () => {
    expect(tenantFilter("tenant-abc", true)).toEqual({})
    expect(tenantFilter(null, true)).toEqual({})
  })

  it("tenantId assente usa null esplicito", () => {
    expect(tenantFilter(null, false)).toEqual({ tenantId: null })
  })
})
