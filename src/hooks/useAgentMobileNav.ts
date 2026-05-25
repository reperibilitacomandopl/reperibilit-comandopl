"use client"

import { useCallback } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

export const AGENT_MOBILE_VIEWS = [
  "dashboard",
  "reperibilita",
  "planning",
  "requests",
  "interventions",
  "ferie",
  "verbali",
  "swaps",
  "cartellino",
  "bacheca",
] as const

export type AgentMobileView = (typeof AGENT_MOBILE_VIEWS)[number]

function resolveView(raw: string | null): AgentMobileView {
  if (!raw || raw === "dashboard") return "dashboard"
  if (AGENT_MOBILE_VIEWS.includes(raw as AgentMobileView)) {
    return raw as AgentMobileView
  }
  return "dashboard"
}

export function useAgentMobileNav(tenantSlug: string) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const activeTab = resolveView(searchParams.get("view"))

  const buildUrl = useCallback(
    (opts: { view?: string; month?: number; year?: number; hash?: string }) => {
      const params = new URLSearchParams(searchParams.toString())
      const view = opts.view ?? activeTab

      if (!view || view === "dashboard") {
        params.delete("view")
      } else {
        params.set("view", view)
      }

      if (opts.month !== undefined) params.set("month", String(opts.month))
      if (opts.year !== undefined) params.set("year", String(opts.year))

      const q = params.toString()
      const hash = opts.hash ? `#${opts.hash}` : ""
      const base = pathname || `/${tenantSlug}`
      return `${base}${q ? `?${q}` : ""}${hash}`
    },
    [searchParams, activeTab, pathname, tenantSlug]
  )

  const navigate = useCallback(
    (view: string, opts?: { month?: number; year?: number; hash?: string }) => {
      router.push(buildUrl({ view, ...opts }))
    },
    [router, buildUrl]
  )

  const scrollToRiepilogo = useCallback(() => {
    if (activeTab !== "dashboard") {
      router.push(buildUrl({ view: "dashboard", hash: "riepilogo-operativo" }))
      return
    }
    requestAnimationFrame(() => {
      document
        .getElementById("riepilogo-operativo")
        ?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }, [activeTab, router, buildUrl])

  const navigateMonth = useCallback(
    (month: number, year: number, view: string = activeTab) => {
      navigate(view, { month, year })
    },
    [navigate, activeTab]
  )

  return { activeTab, navigate, scrollToRiepilogo, navigateMonth, searchParams }
}
