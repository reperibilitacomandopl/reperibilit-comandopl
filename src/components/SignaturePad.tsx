"use client"

import { useRef, useState, useEffect } from "react"
import { Eraser } from "lucide-react"

interface SignaturePadProps {
  onSave: (signature: string) => void
  onClear: () => void
  disabled?: boolean
  initialValue?: string
}

export function SignaturePad({ onSave, onClear, disabled, initialValue }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  useEffect(() => {
    if (initialValue && canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d")
      if (ctx) {
        const img = new Image()
        img.onload = () => {
          ctx.drawImage(img, 0, 0)
        }
        img.src = initialValue
      }
    }
  }, [initialValue])

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (disabled) return
    setIsDrawing(true)
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const { offsetX, offsetY } = getCoordinates(e, canvas)
    ctx.beginPath()
    ctx.moveTo(offsetX, offsetY)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || disabled) return
    e.preventDefault() // Prevent scrolling on mobile
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const { offsetX, offsetY } = getCoordinates(e, canvas)
    ctx.lineTo(offsetX, offsetY)
    ctx.strokeStyle = "#000"
    ctx.lineWidth = 2
    ctx.stroke()
  }

  const stopDrawing = () => {
    if (!isDrawing) return
    setIsDrawing(false)
    const canvas = canvasRef.current
    if (canvas) {
      onSave(canvas.toDataURL("image/png"))
    }
  }

  const getCoordinates = (e: any, canvas: HTMLCanvasElement) => {
    if (e.touches && e.touches.length > 0) {
      const rect = canvas.getBoundingClientRect()
      return {
        offsetX: e.touches[0].clientX - rect.left,
        offsetY: e.touches[0].clientY - rect.top,
      }
    }
    return { offsetX: e.nativeEvent.offsetX, offsetY: e.nativeEvent.offsetY }
  }

  const clearCanvas = () => {
    if (disabled) return
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
      onClear()
    }
  }

  return (
    <div className="relative border-2 border-dashed border-gray-300 bg-gray-50 rounded-xl overflow-hidden touch-none">
      <canvas
        ref={canvasRef}
        width={400}
        height={200}
        className="w-full h-full cursor-crosshair"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
      {!disabled && (
        <button
          type="button"
          onClick={clearCanvas}
          className="absolute top-2 right-2 p-2 bg-white text-gray-500 hover:text-red-500 rounded-lg shadow-sm border text-xs flex items-center gap-1"
        >
          <Eraser size={14} /> Cancella
        </button>
      )}
    </div>
  )
}
