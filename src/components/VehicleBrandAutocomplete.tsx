"use client"

import { useState, useEffect, useRef } from "react"
import { Search, Car, X } from "lucide-react"

type Brand = {
  id: string
  codice: string
  descrizione: string
}

interface BrandSearchProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function VehicleBrandAutocomplete({ value, onChange, placeholder = "Es. FIAT", className = "" }: BrandSearchProps) {
  const [query, setQuery] = useState(value)
  const [results, setResults] = useState<Brand[]>([])
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
    if (query.length < 1) {
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
        const res = await fetch(`/api/agent/vehicles/brands?q=${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          setResults(data)
          setShowDropdown(true)
        }
      } catch (err) {
        console.error("Errore ricerca marche:", err)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query, value])

  const handleSelect = (brand: Brand) => {
    isSelecting.current = true
    setQuery(brand.descrizione)
    onChange(brand.descrizione)
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
          className={`w-full bg-slate-900 border border-white/10 rounded-2xl p-4 pl-10 pr-10 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-white ${className}`}
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
          {results.map((brand, index) => (
            <button
              key={brand.id}
              type="button"
              onClick={() => handleSelect(brand)}
              className={`w-full text-left p-3 hover:bg-white/5 transition-all flex items-center gap-3 ${index !== results.length - 1 ? 'border-b border-white/5' : ''}`}
            >
              <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl shrink-0">
                <Car size={14} />
              </div>
              <div className="flex-1 truncate">
                <p className="text-sm font-bold text-white">{brand.descrizione}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
