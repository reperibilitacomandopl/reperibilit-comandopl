"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Shield, Cookie, X } from "lucide-react"

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent")
    if (!consent) {
      // Delay to avoid layout shift on page load
      const timer = setTimeout(() => setVisible(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [])

  const accept = (type: "all" | "necessary") => {
    localStorage.setItem("cookie-consent", type)
    localStorage.setItem("cookie-consent-date", new Date().toISOString())
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 md:p-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="max-w-4xl mx-auto bg-[#0a0f1a]/95 backdrop-blur-2xl border border-white/10 rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-2xl shadow-black/40">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
          {/* Icon + Text */}
          <div className="flex items-start gap-4 flex-1">
            <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
              <Cookie className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white mb-1">Questo sito utilizza i cookie</h3>
              <p className="text-xs text-white/50 leading-relaxed">
                Utilizziamo cookie tecnici necessari al funzionamento e cookie analitici per migliorare la tua esperienza.{" "}
                <Link href="/cookie-policy" className="text-blue-400 hover:text-blue-300 underline underline-offset-2">
                  Cookie Policy
                </Link>
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
            <button
              onClick={() => accept("necessary")}
              className="flex-1 md:flex-none px-4 py-2.5 bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-white/70 hover:bg-white/20 hover:text-white transition-all active:scale-95"
            >
              Solo Necessari
            </button>
            <button
              onClick={() => accept("all")}
              className="flex-1 md:flex-none px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl text-xs font-bold text-white shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 transition-all active:scale-95"
            >
              Accetta Tutti
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
