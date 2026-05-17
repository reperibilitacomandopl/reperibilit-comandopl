"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

interface Shortcut {
  key: string
  ctrl?: boolean
  description: string
  action: () => void
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      // Non attivare shortcut quando si scrive in input
      const tag = (e.target as HTMLElement).tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return

      for (const s of shortcuts) {
        const ctrlMatch = s.ctrl ? (e.ctrlKey || e.metaKey) : true
        if (e.key.toLowerCase() === s.key.toLowerCase() && ctrlMatch) {
          e.preventDefault()
          s.action()
          return
        }
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [shortcuts])
}

export function useGlobalShortcuts(tenantSlug: string) {
  const router = useRouter()

  useKeyboardShortcuts([
    {
      key: "k", ctrl: true,
      description: "Ricerca globale",
      action: () => document.getElementById("global-search")?.focus()
    },
    {
      key: "1",
      description: "Dashboard",
      action: () => router.push(`/${tenantSlug}/admin/pannello`)
    },
    {
      key: "2",
      description: "Pianificazione",
      action: () => router.push(`/${tenantSlug}/admin/pianificazione`)
    },
    {
      key: "3",
      description: "Ordine di Servizio",
      action: () => router.push(`/${tenantSlug}/admin/ods`)
    },
    {
      key: "4",
      description: "Sala Operativa",
      action: () => router.push(`/${tenantSlug}/admin/sala-operativa`)
    },
    {
      key: "5",
      description: "Report Mensile",
      action: () => router.push(`/${tenantSlug}/admin/report`)
    },
    {
      key: "6",
      description: "Dashboard Comandante",
      action: () => router.push(`/${tenantSlug}/admin/comandante`)
    },
    {
      key: "?",
      description: "Mostra/Nascondi scorciatoie",
      action: () => {
        const el = document.getElementById("shortcuts-help")
        if (el) el.classList.toggle("hidden")
      }
    }
  ])
}
