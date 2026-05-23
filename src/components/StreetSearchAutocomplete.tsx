"use client"

import { useState, useEffect, useRef } from "react"
import { Search, MapPin, X } from "lucide-react"

type Street = {
  id: string
  codice: string | null
  denominazione: string
  comune: string | null
}

interface StreetSearchProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function StreetSearchAutocomplete({ value, onChange, placeholder = "Indirizzo o via...", className = "" }: StreetSearchProps) {
  const [query, setQuery] = useState(value)
  const [results, setResults] = useState<Street[]>([])
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Sync internal state with external value if it changes externally
  useEffect(() => {
    setQuery(value)
  }, [value])

  // Click outside to close dropdown
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

    // Only search if user is typing (not if they just selected a result)
    if (query === value && query.length > 0) {
        return;
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/agent/streets/search?q=${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          setResults(data)
          setShowDropdown(true)
        }
      } catch (err) {
        console.error("Errore ricerca vie:", err)
      } finally {
        setLoading(false)
      }
    }, 300) // 300ms debounce

    return () => clearTimeout(timer)
  }, [query, value])

  const handleSelect = (street: Street) => {
    const fullAddress = street.comune ? `${street.denominazione}, ${street.comune}` : street.denominazione
    setQuery(fullAddress)
    onChange(fullAddress)
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
            setQuery(e.target.value)
            onChange(e.target.value) // Propagate typed text even if not selected from list
          }}
          onFocus={() => {
            if (results.length > 0) setShowDropdown(true)
          }}
          placeholder={placeholder}
          className={`w-full bg-slate-900 border border-white/10 rounded-2xl p-3 pl-10 pr-10 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-white ${className}`}
        />
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        
        {query && (
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
        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-white/10 rounded-2xl shadow-2xl z-50 max-h-60 overflow-y-auto animate-in slide-in-from-top-2">
          {results.map((street, index) => (
            <button
              key={street.id}
              type="button"
              onClick={() => handleSelect(street)}
              className={`w-full text-left p-3 hover:bg-white/5 transition-all flex items-center gap-3 ${index !== results.length - 1 ? 'border-b border-white/5' : ''}`}
            >
              <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl shrink-0">
                <MapPin size={14} />
              </div>
              <div className="flex-1 truncate">
                <p className="text-sm font-bold text-white truncate">{street.denominazione}</p>
                {street.comune && <p className="text-[10px] text-slate-400">{street.comune}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
