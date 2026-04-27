"use client"

import { useState, useEffect } from "react"
import { Cloud, Sun, CloudRain, CloudSnow, CloudLightning, Wind, Loader2 } from "lucide-react"

// Mappa i codici WMO (World Meteorological Organization) di Open-Meteo
const getWeatherIcon = (code: number) => {
  if (code === 0) return <Sun className="text-amber-400" size={24} />
  if (code >= 1 && code <= 3) return <Cloud className="text-slate-400" size={24} />
  if (code >= 51 && code <= 67) return <CloudRain className="text-blue-400" size={24} />
  if (code >= 71 && code <= 77) return <CloudSnow className="text-sky-300" size={24} />
  if (code >= 95) return <CloudLightning className="text-purple-500" size={24} />
  return <Cloud className="text-slate-400" size={24} />
}

const getWeatherDesc = (code: number) => {
  if (code === 0) return "Sereno"
  if (code === 1 || code === 2) return "Poco Nuvoloso"
  if (code === 3) return "Coperto"
  if (code >= 51 && code <= 67) return "Pioggia"
  if (code >= 71 && code <= 77) return "Neve"
  if (code >= 95) return "Temporale"
  return "Variabile"
}

export default function WeatherWidget({ lat = "41.9028", lon = "12.4964", city = "Roma" }: { lat?: string, lon?: string, city?: string }) {
  const [weather, setWeather] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`)
        if (res.ok) setWeather(await res.json())
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    
    // Per migliorare l'esperienza utente potremmo usare navigator.geolocation qui, 
    // ma passiamo le coordinate di base tramite props.
    fetchWeather()
  }, [lat, lon])

  if (loading) {
    return (
      <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-4 flex items-center justify-center min-h-[80px]">
        <Loader2 className="animate-spin text-slate-400" size={20} />
      </div>
    )
  }

  if (!weather) return null

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-4 flex items-center justify-between shadow-lg text-white">
      <div className="flex items-center gap-4">
        <div className="p-2 bg-white/10 rounded-xl shadow-inner">
          {getWeatherIcon(weather.weather_code)}
        </div>
        <div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{city}</p>
          <p className="text-lg font-black leading-tight flex items-center gap-2">
            {weather.temperature_2m}°C 
            <span className="text-sm font-semibold text-slate-300 capitalize">{getWeatherDesc(weather.weather_code)}</span>
          </p>
        </div>
      </div>
      <div className="flex flex-col items-end">
        <div className="flex items-center gap-1 text-slate-400 text-xs font-bold">
          <Wind size={12} />
          {weather.wind_speed_10m} km/h
        </div>
        <div className="text-[9px] text-slate-500 font-bold uppercase mt-1">Aggiornato ora</div>
      </div>
    </div>
  )
}
