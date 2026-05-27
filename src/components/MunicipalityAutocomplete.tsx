"use client"

import { useState, useEffect, useRef } from "react"
import { Search, MapPin, X } from "lucide-react"

type Municipality = {
  id: string
  codiceBelfiore: string
  denominazione: string
  provincia: string
}

interface MunicipalitySearchProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  theme?: "light" | "dark"
}

export function MunicipalityAutocomplete({ value, onChange, placeholder = "Es. Roma", className = "", theme = "dark" }: MunicipalitySearchProps) {
  const [query, setQuery] = useState(value)
  const [results, setResults] = useState<Municipality[]>([])
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const isSelecting = useRef(false)
  const isInitialMount = useRef(true)

  useEffect(() => {
    setQuery(value)
  }, [value])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      return
    }

    if (isInitialMount.current) {
      isInitialMount.current = false
      if (query === value) return
    }

    if (isSelecting.current) {
      isSelecting.current = false
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/agent/municipalities/search?q=${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          setResults(data)
          setShowDropdown(true)
        }
      } catch (err) {
        console.error("Errore ricerca comuni:", err)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query, value])

  const handleSelect = (municipality: Municipality) => {
    isSelecting.current = true
    const label = `${municipality.denominazione} (${municipality.provincia})`
    setQuery(label)
    onChange(label)
    setShowDropdown(false)
  }

  const handleClear = () => {
    setQuery("")
    onChange("")
    setResults([])
    setShowDropdown(false)
  }

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value.toUpperCase())
            onChange(e.target.value.toUpperCase()) 
          }}
          onFocus={() => {
            if (results.length > 0) setShowDropdown(true)
          }}
          placeholder={placeholder}
          className={`w-full ${theme === 'dark' ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'} border rounded-2xl p-4 pl-10 pr-10 text-sm focus:ring-2 focus:ring-blue-500 outline-none ${className}`}
        />
        <Search size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-400'}`} />
        
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        )}

        {!loading && query && (
          <button 
            type="button"
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {showDropdown && results.length > 0 && (
        <div className={`absolute top-full left-0 right-0 mt-2 ${theme === 'dark' ? 'bg-slate-800 border-white/10' : 'bg-white border-slate-200'} border rounded-2xl shadow-2xl z-[100] max-h-60 overflow-y-auto animate-in slide-in-from-top-2`}>
          {results.map((mun, index) => (
            <button
              key={mun.id}
              type="button"
              onClick={() => handleSelect(mun)}
              className={`w-full text-left p-3 hover:bg-black/5 dark:hover:bg-white/5 transition-all flex items-center gap-3 ${index !== results.length - 1 ? (theme === 'dark' ? 'border-b border-white/5' : 'border-b border-slate-100') : ''}`}
            >
              <div className="p-2 bg-emerald-500/20 text-emerald-500 rounded-xl shrink-0">
                <MapPin size={14} />
              </div>
              <div className="flex-1 truncate">
                <p className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{mun.denominazione} ({mun.provincia})</p>
                <p className={`text-[10px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Cod. {mun.codiceBelfiore}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
