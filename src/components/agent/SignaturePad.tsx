"use client"

import { useRef, useState, useCallback } from "react"
import { Check, X, RotateCcw } from "lucide-react"

interface SignaturePadProps {
  onSave: (dataUrl: string) => void
  onCancel: () => void
  label?: string
}

export default function SignaturePad({ onSave, onCancel, label = "Firma del cittadino" }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)

  const getPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY }
  }, [])

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const { x, y } = getPos(e)
    const ctx = canvasRef.current!.getContext("2d")!
    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return
    e.preventDefault()
    const { x, y } = getPos(e)
    const ctx = canvasRef.current!.getContext("2d")!
    ctx.lineTo(x, y)
    ctx.stroke()
    setHasDrawn(true)
  }

  const endDraw = () => {
    setIsDrawing(false)
  }

  const handleSave = () => {
    const dataUrl = canvasRef.current!.toDataURL("image/png")
    onSave(dataUrl)
  }

  const clear = () => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext("2d")!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
      <p className="text-xs font-black text-slate-700 uppercase tracking-widest">{label}</p>
      <div className="border-2 border-dashed border-slate-300 rounded-xl overflow-hidden bg-slate-50">
        <canvas
          ref={canvasRef}
          width={400}
          height={180}
          className="w-full h-[180px] touch-none cursor-crosshair"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
      </div>
      <div className="flex items-center gap-2">
        <button onClick={handleSave} disabled={!hasDrawn}
          className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1 transition-colors">
          <Check size={14} /> Conferma Firma
        </button>
        <button onClick={clear} disabled={!hasDrawn}
          className="p-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 rounded-xl transition-colors"
          aria-label="Cancella firma">
          <RotateCcw size={14} />
        </button>
        <button onClick={onCancel}
          className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-xl transition-colors"
          aria-label="Annulla">
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
