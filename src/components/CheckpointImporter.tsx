"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import {
  Upload, FileText, Eye, Save, AlertTriangle, CheckCircle,
  Loader2, RotateCw, RotateCcw, X, ChevronDown, ChevronUp, Edit3, Trash2, Camera, Shield,
  Pencil, Undo2, ZoomIn, ZoomOut, Maximize2, Minimize2, ArrowLeft
} from "lucide-react"
import * as pdfjsLib from "pdfjs-dist"
import CdsViolationSearch from "./CdsViolationSearch"

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'
}

const ALL_PRIVACY_FIELDS = ['intestazione', 'veicolo', 'proprietario', 'conducente', 'patente', 'sanzione', 'passeggero']

type RedactionBox = {
  id: string
  label: string
  color: string
  x: number // percentage (0-100)
  y: number // percentage (0-100)
  width: number // percentage (0-100)
  height: number // percentage (0-100)
  active: boolean
}

const DEFAULT_BOXES: RedactionBox[] = [
  { id: 'intestazione', label: 'Intestazione / Operatori', color: 'border-yellow-500 bg-yellow-500/10', x: 2, y: 1, width: 96, height: 8, active: false },
  { id: 'veicolo_1', label: 'Veicolo 1 - Dati Conducente/Proprietario', color: 'border-red-500 bg-red-500/10', x: 2, y: 10, width: 96, height: 21, active: false },
  { id: 'veicolo_2', label: 'Veicolo 2 - Dati Conducente/Proprietario', color: 'border-cyan-500 bg-cyan-500/10', x: 2, y: 32, width: 96, height: 21, active: false },
  { id: 'veicolo_3', label: 'Veicolo 3 - Dati Conducente/Proprietario', color: 'border-purple-500 bg-purple-500/10', x: 2, y: 54, width: 96, height: 21, active: false },
  { id: 'veicolo_4', label: 'Veicolo 4 - Dati Conducente/Proprietario', color: 'border-emerald-500 bg-emerald-500/10', x: 2, y: 76, width: 96, height: 21, active: false },
]


type OcrVehicle = {
  ora_controllo?: string
  targa?: string
  veicolo?: string
  marca_modello?: string
  ultima_revisione?: string
  assicurazione?: string
  assicurato_fino?: string
  proprietario_cognome?: string
  proprietario_nome?: string
  proprietario_data_nascita?: string
  proprietario_luogo_nascita?: string
  proprietario_residenza?: string
  proprietario_indirizzo?: string
  conducente_stesso_prop?: boolean
  conducente_cognome?: string
  conducente_nome?: string
  conducente_data_nascita?: string
  conducente_luogo_nascita?: string
  conducente_residenza?: string
  conducente_indirizzo?: string
  patente_numero?: string
  patente_rilasciata_da?: string
  patente_data_rilascio?: string
  patente_validita_fino?: string
  sanzione_elevata?: string
  sanzione_accessoria?: string
  passeggero_cognome?: string
  passeggero_nome?: string
  passeggero_data_nascita?: string
  passeggero_luogo_nascita?: string
  passeggero_residenza?: string
  passeggero_indirizzo?: string
  violation_id?: string
  cdsViolationId?: string
  cdsViolationCandidates?: Array<{
    id: string
    articolo: number
    comma: string | null
    codice: string | null
    descrizione: string
    sanzione: number
    score: number
  }>
}

type OcrResult = {
  controllo: {
    data_controllo?: string
    ora_inizio?: string
    ora_fine?: string
    luogo?: string
    operatori?: string
  }
  veicoli: OcrVehicle[]
  model?: string
  warning?: string
}

export default function CheckpointImporter({ isDark, onImportComplete }: { isDark: boolean; onImportComplete: () => void }) {
  const [step, setStep] = useState<"upload" | "processing" | "review" | "saving" | "done">("upload")
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [privacyFields, setPrivacyFields] = useState<string[]>(ALL_PRIVACY_FIELDS)
  const [expandedVehicle, setExpandedVehicle] = useState<number | null>(null)
  const [matchedViolations, setMatchedViolations] = useState<Record<number, any[]>>({})
  const [saveResult, setSaveResult] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Redaction boxes state
  const [boxes, setBoxes] = useState<RedactionBox[]>(DEFAULT_BOXES)
  const [activeDrag, setActiveDrag] = useState<{
    boxId: string
    type: 'move' | 'nw' | 'ne' | 'se' | 'sw'
    startX: number
    startY: number
    startBoxX: number
    startBoxY: number
    startBoxW: number
    startBoxH: number
  } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [rotation, setRotation] = useState<number>(0)

  // Pen tool & Freehand redaction state
  const [toolMode, setToolMode] = useState<'box' | 'pen'>('box')
  const [penWidth, setPenWidth] = useState<number>(12)
  const [penStrokes, setPenStrokes] = useState<Array<{ points: Array<{ x: number, y: number }>; width: number }>>([])
  const [isDrawing, setIsDrawing] = useState<boolean>(false)
  const currentStrokeRef = useRef<Array<{ x: number, y: number }>>([])

  // Magnifying lens & Modal preview state for Review step
  const [lens, setLens] = useState<{ show: boolean; x: number; y: number; relX: number; relY: number }>({
    show: false, x: 0, y: 0, relX: 0, relY: 0
  })
  const [lensZoom, setLensZoom] = useState<number>(3.5)
  const [isZoomModalOpen, setIsZoomModalOpen] = useState<boolean>(false)
  const [modalZoomScale, setModalZoomScale] = useState<number>(1.5)

  // Escape key listener to close full screen modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isZoomModalOpen) {
        setIsZoomModalOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isZoomModalOpen])

  const handlePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    boxId: string,
    type: 'move' | 'nw' | 'ne' | 'se' | 'sw'
  ) => {
    e.preventDefault()
    e.stopPropagation()
    const targetBox = boxes.find(b => b.id === boxId)
    if (!targetBox) return

    ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)

    setActiveDrag({
      boxId,
      type,
      startX: e.clientX,
      startY: e.clientY,
      startBoxX: targetBox.x,
      startBoxY: targetBox.y,
      startBoxW: targetBox.width,
      startBoxH: targetBox.height
    })
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!activeDrag || !containerRef.current) return
    e.preventDefault()

    const rect = containerRef.current.getBoundingClientRect()
    const deltaX = ((e.clientX - activeDrag.startX) / rect.width) * 100
    const deltaY = ((e.clientY - activeDrag.startY) / rect.height) * 100

    setBoxes(prev => prev.map(box => {
      if (box.id !== activeDrag.boxId) return box

      let newX = box.x
      let newY = box.y
      let newW = box.width
      let newH = box.height

      if (activeDrag.type === 'move') {
        newX = Math.max(0, Math.min(100 - box.width, activeDrag.startBoxX + deltaX))
        newY = Math.max(0, Math.min(100 - box.height, activeDrag.startBoxY + deltaY))
      } else if (activeDrag.type === 'se') {
        newW = Math.max(5, Math.min(100 - box.x, activeDrag.startBoxW + deltaX))
        newH = Math.max(5, Math.min(100 - box.y, activeDrag.startBoxH + deltaY))
      } else if (activeDrag.type === 'sw') {
        const potentialX = activeDrag.startBoxX + deltaX
        if (potentialX >= 0 && activeDrag.startBoxW - deltaX >= 5) {
          newX = potentialX
          newW = activeDrag.startBoxW - deltaX
        }
        newH = Math.max(5, Math.min(100 - box.y, activeDrag.startBoxH + deltaY))
      } else if (activeDrag.type === 'ne') {
        newW = Math.max(5, Math.min(100 - box.x, activeDrag.startBoxW + deltaX))
        const potentialY = activeDrag.startBoxY + deltaY
        if (potentialY >= 0 && activeDrag.startBoxH - deltaY >= 5) {
          newY = potentialY
          newH = activeDrag.startBoxH - deltaY
        }
      } else if (activeDrag.type === 'nw') {
        const potentialX = activeDrag.startBoxX + deltaX
        const potentialY = activeDrag.startBoxY + deltaY
        if (potentialX >= 0 && activeDrag.startBoxW - deltaX >= 5) {
          newX = potentialX
          newW = activeDrag.startBoxW - deltaX
        }
        if (potentialY >= 0 && activeDrag.startBoxH - deltaY >= 5) {
          newY = potentialY
          newH = activeDrag.startBoxH - deltaY
        }
      }

      return {
        ...box,
        x: Math.round(newX * 100) / 100,
        y: Math.round(newY * 100) / 100,
        width: Math.round(newW * 100) / 100,
        height: Math.round(newH * 100) / 100
      }
    }))
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!activeDrag) return
    e.preventDefault()
    try {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId)
    } catch {}
    setActiveDrag(null)
  }

  // Handle Pen Drawing
  const handlePenPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (toolMode !== 'pen' || !containerRef.current) return
    e.preventDefault()
    e.stopPropagation()
    const rect = containerRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100))
    
    setIsDrawing(true)
    currentStrokeRef.current = [{ x, y }]
    setPenStrokes(prev => [...prev, { points: [{ x, y }], width: penWidth }])

    try {
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
    } catch {}
  }

  const handlePenPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (toolMode !== 'pen' || !isDrawing || !containerRef.current) return
    e.preventDefault()
    const rect = containerRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100))

    currentStrokeRef.current.push({ x, y })
    const updatedPoints = [...currentStrokeRef.current]

    setPenStrokes(prev => {
      if (prev.length === 0) return prev
      const copy = [...prev]
      copy[copy.length - 1] = { points: updatedPoints, width: penWidth }
      return copy
    })
  }

  const handlePenPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (toolMode !== 'pen' || !isDrawing) return
    setIsDrawing(false)
    try {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId)
    } catch {}
  }

  const undoLastStroke = () => {
    setPenStrokes(prev => prev.slice(0, -1))
  }

  const clearAllStrokes = () => {
    setPenStrokes([])
  }

  const rotateCanvasImage = (direction: 'cw' | 'ccw') => {
    if (!preview) return
    const img = new Image()
    img.src = preview
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalHeight
      canvas.height = img.naturalWidth
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate((direction === 'cw' ? 90 : -90) * Math.PI / 180)
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2)
      const dataUrl = canvas.toDataURL('image/png')
      setPreview(dataUrl)
      canvas.toBlob(blob => {
        if (blob && file) {
          const updatedFile = new File([blob], file.name.replace(/\.pdf$/i, '.png'), { type: 'image/png' })
          setFile(updatedFile)
        }
      }, 'image/png')
    }
  }

  const addCustomBox = () => {
    const newId = `custom_${Date.now()}`
    const colors = [
      'border-rose-500 bg-rose-500/10',
      'border-blue-500 bg-blue-500/10',
      'border-amber-500 bg-amber-500/10',
      'border-emerald-500 bg-emerald-500/10',
      'border-purple-500 bg-purple-500/10'
    ]
    const randomColor = colors[boxes.length % colors.length]
    setBoxes(prev => [
      ...prev,
      {
        id: newId,
        label: `Riquadro Censura #${prev.length + 1}`,
        color: randomColor,
        x: 5,
        y: Math.min(80, 10 + (prev.length % 5) * 15),
        width: 90,
        height: 15,
        active: true
      }
    ])
  }

  const removeBox = (id: string) => {
    setBoxes(prev => prev.filter(b => b.id !== id))
  }

  const getRedactedImageBlob = (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (!file) return reject(new Error('No file selected'))

      const img = new Image()
      img.src = preview || ''
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('Canvas context not available'))

        // Draw original image
        ctx.drawImage(img, 0, 0)

        // Draw black rectangles for active redaction boxes
        ctx.fillStyle = 'black'
        boxes.forEach(box => {
          if (!box.active) return

          const px = (box.x / 100) * canvas.width
          const py = (box.y / 100) * canvas.height
          const pw = (box.width / 100) * canvas.width
          const ph = (box.height / 100) * canvas.height

          ctx.fillRect(px, py, pw, ph)
        })

        // Draw freehand pen strokes
        ctx.strokeStyle = 'black'
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

        penStrokes.forEach(stroke => {
          if (stroke.points.length === 0) return
          // Calculate stroke width relative to canvas size
          ctx.lineWidth = (stroke.width / 1000) * canvas.width
          ctx.beginPath()
          const start = stroke.points[0]
          ctx.moveTo((start.x / 100) * canvas.width, (start.y / 100) * canvas.height)
          for (let i = 1; i < stroke.points.length; i++) {
            const pt = stroke.points[i]
            ctx.lineTo((pt.x / 100) * canvas.width, (pt.y / 100) * canvas.height)
          }
          ctx.stroke()
        })

        // Export as blob
        canvas.toBlob(blob => {
          if (blob) resolve(blob)
          else reject(new Error('Canvas export failed'))
        }, file.type || 'image/jpeg', 0.9)
      }
      img.onerror = (e) => reject(e)
    })
  }


  useEffect(() => {
    fetch('/api/agent/users').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setUsers(data)
    }).catch(() => {})
  }, [])

  const cardBg = isDark ? "bg-slate-900 border-white/5" : "bg-white border-slate-200"
  const inputBg = isDark ? "bg-slate-950 border-white/10 text-white placeholder-white/30" : "bg-white border-slate-200 text-slate-900 placeholder-slate-400"
  const mutedText = isDark ? "text-white/40" : "text-slate-400"

  const handleFileSelect = useCallback((f: File) => {
    setFile(f)
    setError(null)
    // Generate preview for images and PDF
    if (f.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = e => setPreview(e.target?.result as string)
      reader.readAsDataURL(f)
    } else if (f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')) {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const typedarray = new Uint8Array(e.target?.result as ArrayBuffer)
          const pdf = await pdfjsLib.getDocument(typedarray).promise
          const page = await pdf.getPage(1)
          const viewport = page.getViewport({ scale: 2.0 }) // render ad alta risoluzione
          const canvas = document.createElement('canvas')
          const context = canvas.getContext('2d')
          if (!context) throw new Error("No context")
          canvas.height = viewport.height
          canvas.width = viewport.width
          await page.render({ canvasContext: context, viewport }).promise
          
          const dataUrl = canvas.toDataURL('image/png')
          canvas.toBlob(blob => {
            if (blob) {
              const newFile = new File([blob], f.name.replace(/\.pdf$/i, '.png'), { type: 'image/png' })
              setFile(newFile)     // Sovrascrive il file originario trasformandolo in immagine
              setPreview(dataUrl)  // Imposta l'anteprima
            }
          }, 'image/png')
        } catch (err) {
          console.error("Errore durante il rendering del PDF:", err)
          setPreview(URL.createObjectURL(f)) // Fallback standard
        }
      }
      reader.readAsArrayBuffer(f)
    } else {
      setPreview(null)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) handleFileSelect(f)
  }, [handleFileSelect])

  const processOCR = async () => {
    if (!file) return
    setStep("processing")
    setError(null)

    try {
      const formData = new FormData()

      // If we have active boxes OR freehand pen strokes, redact the image before sending to IA!
      const hasRedaction = boxes.some(b => b.active) || penStrokes.length > 0
      const isImage = file.type.startsWith('image/') || file.name.toLowerCase().endsWith('.png') || file.name.toLowerCase().endsWith('.jpg')

      if (hasRedaction && isImage) {
        try {
          const redactedBlob = await getRedactedImageBlob()
          const redactedFile = new File([redactedBlob], file.name.replace(/\.pdf$/i, '.png'), { type: 'image/png' })
          setPreview(URL.createObjectURL(redactedBlob))
          formData.append('file', redactedFile)
        } catch (err) {
          console.error('Errore durante l\'oscuramento:', err)
          setError('Impossibile oscurare l\'immagine prima dell\'invio. Invio file originale.')
          formData.append('file', file)
        }
      } else {
        formData.append('file', file)
      }

      // Also tell the backend which privacy fields we are filtering (excluding the active boxes)
      const activeIds = boxes.filter(b => b.active).map(b => b.id)
      const remainingPrivacyFields = ALL_PRIVACY_FIELDS.filter(f => !activeIds.includes(f))
      formData.append('privacyFields', remainingPrivacyFields.join(','))


      const res = await fetch('/api/admin/checkpoints/import', {
        method: 'POST',
        body: formData
      })

      const data = await res.json()

      if (!res.ok) {
        // Mostra rawText se disponibile per debugging
        const errMsg = data.rawText
          ? `${data.error}\n\n--- RAW GEMINI RESPONSE ---\n${data.rawText.substring(0, 1000)}`
          : (data.error || 'Errore durante il processamento OCR')
        setError(errMsg)
        setStep("upload")
        return
      }

      setOcrResult({
        controllo: data.controllo || {},
        veicoli: (data.veicoli || []),
        model: data.model,
        warning: data.warning
      } as any)
      setStep("review")

    } catch (err) {
      setError('Errore di connessione al server')
      setStep("upload")
    }
  }

  const confirmImport = async () => {
    if (!ocrResult) return
    setStep("saving")

    try {
      const res = await fetch('/api/admin/checkpoints/import/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ocrResult)
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Errore durante il salvataggio')
        setStep("review")
        return
      }

      setSaveResult(data)
      setStep("done")

    } catch {
      setError('Errore di connessione al server')
      setStep("review")
    }
  }

  const updateControlloField = (field: string, value: string) => {
    if (!ocrResult) return
    setOcrResult({
      ...ocrResult,
      controllo: { ...ocrResult.controllo, [field]: value }
    })
  }

  const updateVehicleField = (idx: number, field: string, value: any) => {
    if (!ocrResult) return
    const veicoli = [...ocrResult.veicoli]
    veicoli[idx] = { ...veicoli[idx], [field]: value }
    setOcrResult({ ...ocrResult, veicoli })
  }

  const removeVehicle = (idx: number) => {
    if (!ocrResult) return
    setOcrResult({
      ...ocrResult,
      veicoli: ocrResult.veicoli.filter((_, i) => i !== idx)
    })
  }

  const reset = () => {
    setStep("upload")
    setFile(null)
    setPreview(null)
    setOcrResult(null)
    setError(null)
    setSaveResult(null)
    setMatchedViolations({})
    setRotation(0)
    setPenStrokes([])
    setToolMode('box')
  }

  const loadViolations = async (idx: number, targa?: string) => {
    if (!targa || matchedViolations[idx]) return;
    try {
      const res = await fetch(`/api/agent/violations/by-targa/${targa}`)
      const data = await res.json()
      setMatchedViolations(prev => ({...prev, [idx]: data}))
    } catch (err) {
      console.error('Errore fetch verbali', err)
    }
  }

  return (
    <div className="space-y-6">
      {/* STEP: UPLOAD */}
      {step === "upload" && (
        <div className={`rounded-3xl border ${cardBg} p-8 shadow-sm`}>
          <h2 className="text-lg font-black mb-2 flex items-center gap-3">
            <Upload size={20} className="text-purple-500" /> Importa Scheda via OCR
          </h2>
          <p className={`text-sm mb-6 ${mutedText}`}>Carica un PDF o immagine della scheda di controllo compilata a mano. Gemini AI estrarrà automaticamente i dati.</p>

          {error && (
            <div className="mb-4 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-sm font-bold flex items-center gap-2">
              <AlertTriangle size={16} /> <span className="whitespace-pre-wrap">{error}</span>
            </div>
          )}

          <div
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
              file
                ? "border-blue-500/40 bg-blue-500/5"
                : isDark ? "border-white/10 hover:border-white/20 hover:bg-white/5 cursor-pointer" : "border-slate-300 hover:border-slate-400 hover:bg-slate-50 cursor-pointer"
            }`}
            onClick={(e) => {
              // Only open file dialog if user clicks background and not on active boxes / preview
              if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'DIV' && !(e.target as HTMLElement).closest('.relative')) {
                fileInputRef.current?.click()
              }
            }}
          >
            <input ref={fileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.tiff,.bmp" onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])} className="hidden" />

            {file ? (
              <div className="space-y-4">
                {preview && (
                  file.type.startsWith('image/') ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-2 bg-slate-900/40 p-2.5 rounded-xl border border-slate-700/50">
                        {/* Selector Modalità Strumento */}
                        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-white/10">
                          <button
                            type="button"
                            onClick={() => setToolMode('box')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${toolMode === 'box' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                          >
                            <Shield size={14} /> Riquadri Aree
                          </button>
                          <button
                            type="button"
                            onClick={() => setToolMode('pen')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${toolMode === 'pen' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                          >
                            <Pencil size={14} /> Pennarello Nero
                          </button>
                        </div>

                        {/* Controlli specifici Pennarello */}
                        {toolMode === 'pen' ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-300">Spessore:</span>
                            <button
                              type="button"
                              onClick={() => setPenWidth(6)}
                              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors ${penWidth === 6 ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                            >
                              Fine
                            </button>
                            <button
                              type="button"
                              onClick={() => setPenWidth(12)}
                              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors ${penWidth === 12 ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                            >
                              Medio
                            </button>
                            <button
                              type="button"
                              onClick={() => setPenWidth(22)}
                              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors ${penWidth === 22 ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                            >
                              Largo
                            </button>
                            <button
                              type="button"
                              onClick={undoLastStroke}
                              disabled={penStrokes.length === 0}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white ml-2"
                              title="Annulla ultimo tratto"
                            >
                              <Undo2 size={13} /> Annulla
                            </button>
                            <button
                              type="button"
                              onClick={clearAllStrokes}
                              disabled={penStrokes.length === 0}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded bg-rose-500/20 hover:bg-rose-500/30 disabled:opacity-40 text-rose-300"
                              title="Cancella tutti i tratti"
                            >
                              <Trash2 size={13} /> Pulisci
                            </button>
                          </div>
                        ) : (
                          <p className={`text-xs font-bold ${mutedText}`}>
                            Trascina i riquadri colorati oppure passa a <span className="text-rose-400 font-extrabold">Pennarello</span> per cancellare a mano libera.
                          </p>
                        )}

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); rotateCanvasImage('ccw') }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                            title="Ruota foglio a sinistra"
                          >
                            <RotateCcw size={14} /> Ruota 90° Sx
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); rotateCanvasImage('cw') }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                            title="Ruota foglio a destra"
                          >
                            <RotateCw size={14} /> Ruota 90° Dx
                          </button>
                        </div>
                      </div>
                      <div 
                        ref={containerRef}
                        onPointerDown={toolMode === 'pen' ? handlePenPointerDown : undefined}
                        onPointerMove={toolMode === 'pen' ? handlePenPointerMove : handlePointerMove}
                        onPointerUp={toolMode === 'pen' ? handlePenPointerUp : handlePointerUp}
                        onPointerLeave={toolMode === 'pen' ? handlePenPointerUp : handlePointerUp}
                        className={`relative w-full mx-auto rounded-2xl overflow-hidden shadow-2xl select-none border border-slate-300 dark:border-white/15 bg-slate-950/20 ${toolMode === 'pen' ? 'cursor-crosshair' : 'cursor-default'}`}
                        style={{ touchAction: 'none' }}
                      >
                        <img src={preview} alt="Anteprima Scheda" className="w-full h-auto pointer-events-none display-block" />

                        {/* Layer per i tratti del Pennarello Nero */}
                        <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none z-10">
                          {penStrokes.map((stroke, index) => (
                            <polyline
                              key={index}
                              fill="none"
                              stroke="black"
                              strokeWidth={stroke.width}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              points={stroke.points.map(p => `${p.x * 10},${p.y * 10}`).join(' ')}
                            />
                          ))}
                        </svg>

                        {/* Layer per i riquadri (solo in modalità box) */}
                        {toolMode === 'box' && boxes.map(box => {
                          if (!box.active) return null
                          return (
                            <div
                              key={box.id}
                              className={`absolute border-2 ${box.color} flex flex-col justify-between group transition-shadow hover:shadow-lg z-20`}
                              style={{
                                left: `${box.x}%`,
                                top: `${box.y}%`,
                                width: `${box.width}%`,
                                height: `${box.height}%`,
                                cursor: 'move'
                              }}
                              onPointerDown={(e) => handlePointerDown(e, box.id, 'move')}
                            >
                              {/* Label & Delete button */}
                              <div className="flex items-center justify-between bg-slate-900/90 text-white px-1.5 py-0.5 self-start rounded-br max-w-full overflow-hidden">
                                <span className="text-[10px] font-black uppercase tracking-wider truncate select-none">
                                  {box.label}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); removeBox(box.id) }}
                                  className="ml-1 text-rose-400 hover:text-rose-200 p-0.5 rounded"
                                  title="Elimina riquadro"
                                >
                                  <X size={10} />
                                </button>
                              </div>
                              
                              {/* Handles */}
                              <div className="absolute -top-1 -left-1 w-3 h-3 bg-white border-2 border-slate-950 cursor-nw-resize rounded-full shadow" onPointerDown={(e) => handlePointerDown(e, box.id, 'nw')} />
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-white border-2 border-slate-950 cursor-ne-resize rounded-full shadow" onPointerDown={(e) => handlePointerDown(e, box.id, 'ne')} />
                              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-white border-2 border-slate-950 cursor-se-resize rounded-full shadow" onPointerDown={(e) => handlePointerDown(e, box.id, 'se')} />
                              <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-white border-2 border-slate-950 cursor-sw-resize rounded-full shadow" onPointerDown={(e) => handlePointerDown(e, box.id, 'sw')} />
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 border border-amber-500/20 bg-amber-500/5 rounded-xl text-amber-500 text-xs font-bold max-w-md mx-auto">
                      Non è stato possibile caricare il PDF come immagine. I riquadri di censura interattivi non sono disponibili in questa modalità. I campi privacy selezionati in basso verranno omessi chiedendo all'AI di ignorarli testualmente.
                    </div>
                  )
                )}
                
                <div className="flex items-center justify-center gap-3 border-t border-slate-200 dark:border-white/5 pt-4 max-w-md mx-auto">
                  <FileText size={24} className="text-blue-500" />
                  <div className="text-left">
                    <p className="font-bold text-sm">{file.name}</p>
                    <p className={`text-xs ${mutedText}`}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); reset(); }}
                    className={`p-1 rounded-full ml-auto hover:bg-rose-500/10 text-rose-500 transition-colors`}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <Upload size={48} className={`mx-auto mb-4 ${mutedText}`} />
                <p className="font-bold text-lg mb-1">Trascina qui la scheda</p>
                <p className={`text-sm ${mutedText}`}>Oppure clicca per selezionare un file (PDF, PNG, JPG, TIFF)</p>
              </div>
            )}
          </div>


          {file && (
            <>
              {/* Privacy fields selection */}
              <div className="mt-8 border-t border-slate-200 dark:border-white/10 pt-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Shield size={16} className="text-rose-500" /> Riquadri di Censura Attivi (Posto di Controllo fino a 4 Veicoli)
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setBoxes(prev => prev.map(b => ({ ...b, active: true })))}
                      className={`text-xs px-2.5 py-1 font-bold rounded-lg ${isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-100 hover:bg-slate-200'}`}
                    >
                      Seleziona Tutti
                    </button>
                    <button
                      type="button"
                      onClick={() => setBoxes(prev => prev.map(b => ({ ...b, active: false })))}
                      className={`text-xs px-2.5 py-1 font-bold rounded-lg ${isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-100 hover:bg-slate-200'}`}
                    >
                      Deseleziona Tutti
                    </button>
                    <button
                      type="button"
                      onClick={addCustomBox}
                      className="text-xs px-3 py-1 font-bold rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-sm transition-all"
                    >
                      + Aggiungi Riquadro
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {boxes.map(box => (
                    <div key={box.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${box.active ? 'border-rose-500 bg-rose-500/5' : 'border-slate-200 dark:border-white/10 opacity-50 hover:opacity-100'}`}>
                      <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                        <input 
                          type="checkbox" 
                          checked={box.active} 
                          onChange={(e) => {
                            setBoxes(prev => prev.map(b => b.id === box.id ? { ...b, active: e.target.checked } : b))
                          }} 
                          className="w-4 h-4 rounded text-rose-500 focus:ring-rose-500 bg-transparent border-slate-300 dark:border-slate-600 shrink-0" 
                        />
                        <span className="text-xs font-bold truncate">{box.label}</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => removeBox(box.id)}
                        className="text-slate-400 hover:text-rose-500 p-1 rounded transition-colors shrink-0"
                        title="Rimuovi questo riquadro"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>


              <div className="flex justify-end mt-8 gap-3">
                <button onClick={reset} className={`px-4 py-3 text-sm font-bold rounded-xl ${isDark ? "bg-white/5 hover:bg-white/10" : "bg-slate-100 hover:bg-slate-200"}`}>
                  Annulla
                </button>
                <button onClick={processOCR}
                  className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-purple-600/20 active:scale-95">
                  <Eye size={16} /> Analizza con Gemini AI
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* STEP: PROCESSING */}
      {step === "processing" && (
        <div className={`rounded-3xl border ${cardBg} p-12 shadow-sm text-center`}>
          <div className="w-16 h-16 mx-auto mb-6 bg-purple-500/10 rounded-2xl flex items-center justify-center">
            <Loader2 size={32} className="text-purple-500 animate-spin" />
          </div>
          <h2 className="text-lg font-black mb-2">Analisi in corso...</h2>
          <p className={`text-sm ${mutedText}`}>Gemini AI sta leggendo la scheda. Potrebbe richiedere 10-30 secondi.</p>
        </div>
      )}

      {/* STEP: REVIEW */}
      {step === "review" && ocrResult && (
        <div className="grid grid-cols-1 2xl:grid-cols-12 gap-8 items-start w-full">
          
          {/* Colonna Sinistra: Anteprima Sticky con Lente d'Ingrandimento (7/12 del monitor su 2xl) */}
          <div className="hidden xl:block 2xl:col-span-7 sticky top-4 space-y-3">
            <div className="flex items-center justify-between bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
              <h3 className="text-sm font-black uppercase tracking-widest text-purple-300 flex items-center gap-2">
                <Camera size={16} /> Scansione Originale (Lente d'Ingrandimento HD)
              </h3>
              {preview && (
                <button
                  type="button"
                  onClick={() => setIsZoomModalOpen(true)}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 transition-all active:scale-95"
                >
                  <Maximize2 size={14} /> Schermo Intero HD
                </button>
              )}
            </div>

            {preview ? (
              <div 
                className={`relative rounded-3xl border ${cardBg} p-2 overflow-hidden shadow-xl cursor-crosshair group bg-slate-950/40`}
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  const x = e.clientX - rect.left
                  const y = e.clientY - rect.top
                  const relX = (x / rect.width) * 100
                  const relY = (y / rect.height) * 100
                  setLens({ show: true, x, y, relX, relY })
                }}
                onWheel={(e) => {
                  e.preventDefault()
                  const delta = e.deltaY < 0 ? 0.5 : -0.5
                  setLensZoom(z => Math.max(2.0, Math.min(8.0, Number((z + delta).toFixed(1)))))
                }}
                onMouseLeave={() => setLens(prev => ({ ...prev, show: false }))}
                onClick={() => setIsZoomModalOpen(true)}
              >
                <img src={preview} alt="Anteprima Scheda" className="w-full h-auto max-h-[88vh] object-contain rounded-2xl bg-slate-100 dark:bg-slate-900" />
                
                {/* Lente d'Ingrandimento Fluttuante a Seguito del Mouse con Ingrandimento via Rotellina */}
                {lens.show && (
                  <div
                    className="absolute w-64 h-64 rounded-full border-4 border-purple-500 shadow-2xl pointer-events-none z-50 overflow-hidden ring-4 ring-purple-500/30"
                    style={{
                      left: `${lens.x - 128}px`,
                      top: `${lens.y - 128}px`,
                      backgroundImage: `url(${preview})`,
                      backgroundPosition: `${lens.relX}% ${lens.relY}%`,
                      backgroundSize: `${lensZoom * 100}%`,
                      backgroundRepeat: 'no-repeat'
                    }}
                  >
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-slate-950/90 text-purple-300 text-[10px] font-black uppercase px-3 py-1 rounded-full shadow border border-purple-500/50 flex items-center gap-1.5 whitespace-nowrap">
                      <span>🔍 {lensZoom.toFixed(1)}x ZOOM</span>
                      <span className="text-[9px] text-slate-400 font-normal border-l border-white/20 pl-1.5">Usa rotellina mouse per ingrandire</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className={`rounded-3xl border ${cardBg} p-8 flex items-center justify-center text-center h-[50vh]`}>
                <p className={mutedText}>Anteprima non disponibile</p>
              </div>
            )}
          </div>

          {/* Colonna Destra: Form di Verifica (5/12 del monitor su 2xl) */}
          <div className="2xl:col-span-5 space-y-6">
            <div className={`rounded-3xl border ${cardBg} p-6 shadow-sm`}>
            <h2 className="text-lg font-black mb-4 flex items-center gap-3">
              <Edit3 size={20} className="text-amber-500" /> Revisiona i Dati Estratti
            </h2>
            <p className={`text-sm mb-6 ${mutedText}`}>Verifica e correggi i dati estratti dall'OCR prima di salvare.</p>

            {ocrResult.warning && (
              <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-600 dark:text-amber-400 text-sm font-bold flex items-center gap-2">
                <AlertTriangle size={16} /> {ocrResult.warning}
                {ocrResult.model && <span className="text-xs opacity-60 ml-auto">Modello: {ocrResult.model}</span>}
              </div>
            )}

            {error && (
              <div className="mb-4 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-sm font-bold flex items-center gap-2">
                <AlertTriangle size={16} /> {error}
              </div>
            )}

            {/* Controllo header data */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest opacity-60 mb-1 block">Data Controllo</label>
                <input value={ocrResult.controllo.data_controllo || ''} onChange={e => updateControlloField('data_controllo', e.target.value)} className={`w-full px-3 py-2 rounded-lg border text-sm font-bold ${inputBg}`} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest opacity-60 mb-1 block">Ora Inizio</label>
                  <input value={ocrResult.controllo.ora_inizio || ''} onChange={e => updateControlloField('ora_inizio', e.target.value)} className={`w-full px-3 py-2 rounded-lg border text-sm ${inputBg}`} />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest opacity-60 mb-1 block">Ora Fine</label>
                  <input value={ocrResult.controllo.ora_fine || ''} onChange={e => updateControlloField('ora_fine', e.target.value)} className={`w-full px-3 py-2 rounded-lg border text-sm ${inputBg}`} />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest opacity-60 mb-1 block">Luogo</label>
                <input value={ocrResult.controllo.luogo || ''} onChange={e => updateControlloField('luogo', e.target.value)} className={`w-full px-3 py-2 rounded-lg border text-sm ${inputBg}`} />
              </div>
            </div>
            <div className="mb-6">
              <label className="text-xs font-bold uppercase tracking-widest opacity-60 mb-1 block">Operatori</label>
              <input value={ocrResult.controllo.operatori || ''} onChange={e => updateControlloField('operatori', e.target.value)} className={`w-full px-3 py-2 rounded-lg border text-sm ${inputBg}`} placeholder="es. Ag. Rossi, Isp. Verdi" />
              {users.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {users.map(u => {
                    const name = u.name || `${u.nome || ''} ${u.cognome || ''}`.trim() || u.matricola;
                    return (
                      <button key={u.id} type="button" onClick={() => {
                        const current = ocrResult.controllo.operatori || '';
                        if (current.includes(name)) return;
                        updateControlloField('operatori', current ? `${current}, ${name}` : name);
                      }} className={`px-2 py-1 text-xs rounded-md border font-medium transition-colors ${isDark ? "bg-white/5 border-white/10 hover:bg-white/10" : "bg-slate-50 border-slate-200 hover:bg-slate-100"}`}>
                        + {name}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Veicoli */}
          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 opacity-60">
              Veicoli estratti ({ocrResult.veicoli.length})
            </h3>

            {ocrResult.veicoli.map((v, idx) => (
              <div key={idx} className={`rounded-2xl border ${cardBg} overflow-hidden shadow-sm`}>
                {/* Vehicle summary bar */}
                <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => {
                  const newIdx = expandedVehicle === idx ? null : idx
                  setExpandedVehicle(newIdx)
                  if (newIdx !== null) loadViolations(idx, v.targa)
                }}>
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-black tracking-widest text-blue-500">{v.targa || '???'}</span>
                    <span className={`text-sm ${mutedText}`}>{v.veicolo} {v.marca_modello ? `• ${v.marca_modello}` : ''}</span>
                    {v.sanzione_elevata && <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 text-xs font-bold rounded-lg">Sanzione</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {expandedVehicle === idx ? <ChevronUp size={20} className={mutedText} /> : <ChevronDown size={20} className={mutedText} />}
                    <button onClick={(e) => { e.stopPropagation(); removeVehicle(idx) }}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white transition-all ml-2">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Expanded editing */}
                {expandedVehicle === idx && (
                  <div className={`p-4 border-t ${isDark ? "border-white/5 bg-slate-950/30" : "border-slate-100 bg-slate-50/50"} space-y-4`}>
                    {/* Dati veicolo */}
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">Dati Veicolo</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <InputField label="Ora" value={v.ora_controllo} onChange={val => updateVehicleField(idx, 'ora_controllo', val)} inputBg={inputBg} />
                        <InputField label="Targa" value={v.targa} onChange={val => updateVehicleField(idx, 'targa', val.toUpperCase())} inputBg={inputBg} bold />
                        <InputField label="Tipo" value={v.veicolo} onChange={val => updateVehicleField(idx, 'veicolo', val)} inputBg={inputBg} />
                        <InputField label="Marca/Modello" value={v.marca_modello} onChange={val => updateVehicleField(idx, 'marca_modello', val)} inputBg={inputBg} />
                      </div>
                    </div>

                    {/* Proprietario */}
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">Proprietario</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <InputField label="Cognome" value={v.proprietario_cognome} onChange={val => updateVehicleField(idx, 'proprietario_cognome', val)} inputBg={inputBg} />
                        <InputField label="Nome" value={v.proprietario_nome} onChange={val => updateVehicleField(idx, 'proprietario_nome', val)} inputBg={inputBg} />
                        <InputField label="Data nascita" value={v.proprietario_data_nascita} onChange={val => updateVehicleField(idx, 'proprietario_data_nascita', val)} inputBg={inputBg} />
                        <InputField label="Luogo nascita" value={v.proprietario_luogo_nascita} onChange={val => updateVehicleField(idx, 'proprietario_luogo_nascita', val)} inputBg={inputBg} />
                        <InputField label="Residenza" value={v.proprietario_residenza} onChange={val => updateVehicleField(idx, 'proprietario_residenza', val)} inputBg={inputBg} />
                        <InputField label="Indirizzo" value={v.proprietario_indirizzo} onChange={val => updateVehicleField(idx, 'proprietario_indirizzo', val)} inputBg={inputBg} />
                      </div>
                    </div>

                    {/* Conducente */}
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Conducente</p>
                        <label className="flex items-center gap-1.5 text-xs font-bold">
                          <input type="checkbox" checked={!!v.conducente_stesso_prop} onChange={e => updateVehicleField(idx, 'conducente_stesso_prop', e.target.checked)} className="rounded" />
                          = Proprietario
                        </label>
                      </div>
                      {!v.conducente_stesso_prop && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          <InputField label="Cognome" value={v.conducente_cognome} onChange={val => updateVehicleField(idx, 'conducente_cognome', val)} inputBg={inputBg} />
                          <InputField label="Nome" value={v.conducente_nome} onChange={val => updateVehicleField(idx, 'conducente_nome', val)} inputBg={inputBg} />
                          <InputField label="Data nascita" value={v.conducente_data_nascita} onChange={val => updateVehicleField(idx, 'conducente_data_nascita', val)} inputBg={inputBg} />
                        </div>
                      )}
                    </div>

                    {/* Patente */}
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">Patente</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <InputField label="Numero" value={v.patente_numero} onChange={val => updateVehicleField(idx, 'patente_numero', val)} inputBg={inputBg} />
                        <InputField label="Rilasciata da" value={v.patente_rilasciata_da} onChange={val => updateVehicleField(idx, 'patente_rilasciata_da', val)} inputBg={inputBg} />
                        <InputField label="Data rilascio" value={v.patente_data_rilascio} onChange={val => updateVehicleField(idx, 'patente_data_rilascio', val)} inputBg={inputBg} />
                        <InputField label="Valida fino" value={v.patente_validita_fino} onChange={val => updateVehicleField(idx, 'patente_validita_fino', val)} inputBg={inputBg} />
                      </div>
                    </div>

                    {/* Sanzioni */}
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">Sanzioni</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <InputField label="Sanzione elevata" value={v.sanzione_elevata} onChange={val => updateVehicleField(idx, 'sanzione_elevata', val)} inputBg={inputBg} />
                        <InputField label="Sanzione accessoria" value={v.sanzione_accessoria} onChange={val => updateVehicleField(idx, 'sanzione_accessoria', val)} inputBg={inputBg} />
                      </div>

                      {/* CDS Catalog Search */}
                      {v.sanzione_elevata && (
                        <div className="mb-3">
                          <CdsViolationSearch
                            initialText={v.sanzione_elevata}
                            apiEndpoint="/api/admin/cds/violations/search"
                            onSelect={(violation: any) => updateVehicleField(idx, 'cdsViolationId', violation.id)}
                          />
                          {v.cdsViolationId && (
                            <div className="mt-2 p-2 bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/20 rounded-lg flex items-center gap-2">
                              <CheckCircle size={14} className="text-emerald-600 dark:text-emerald-400" />
                              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                                Violazione CDS collegata
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Collega a verbale esistente */}
                      {(v.sanzione_elevata || matchedViolations[idx]?.length > 0) && (
                        <div className={`p-3 rounded-xl border ${isDark ? "border-amber-500/20 bg-amber-500/5" : "border-amber-500/30 bg-amber-50"}`}>
                          <label className="text-xs font-bold text-amber-600 dark:text-amber-500 mb-1.5 block flex items-center gap-2">
                            <Shield size={14} /> Collega al Verbale (Ricerca automatica per targa: {v.targa})
                          </label>
                          <select 
                            value={v.violation_id || ""} 
                            onChange={(e) => updateVehicleField(idx, 'violation_id', e.target.value)}
                            className={`w-full px-3 py-2 rounded-lg border text-sm font-bold ${inputBg} ${isDark ? "border-amber-500/30" : "border-amber-500/50"}`}
                          >
                            <option value="">-- Nessun verbale collegato (Salva solo testo) --</option>
                            {matchedViolations[idx]?.map((viol: any) => (
                              <option key={viol.id} value={viol.id}>
                                Verbale {viol.documentType} del {new Date(viol.createdAt).toLocaleDateString()} - Art. {viol.cdsViolation?.articolo?.articolo} {viol.cdsViolation?.comma ? `c. ${viol.cdsViolation.comma}` : ''} - €{viol.importo}
                              </option>
                            ))}
                          </select>
                          {!matchedViolations[idx] && <p className="text-xs opacity-60 mt-2 animate-pulse">Ricerca verbali in corso...</p>}
                          {matchedViolations[idx]?.length === 0 && <p className="text-xs opacity-60 mt-2">Nessun verbale recente trovato per questa targa.</p>}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex justify-between items-center bg-white dark:bg-slate-900 sticky bottom-4 p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl z-50">
            <button onClick={reset} className={`px-4 py-3 text-sm font-bold rounded-xl ${isDark ? "bg-white/5 hover:bg-white/10" : "bg-slate-100 hover:bg-slate-200"}`}>
              ← Annulla
            </button>
            <button onClick={confirmImport} disabled={!ocrResult.veicoli.length}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-600/20 active:scale-95">
              <Save size={16} /> Conferma e Salva ({ocrResult.veicoli.length} veicoli)
            </button>
          </div>
          </div>
        </div>
      )}

      {/* STEP: SAVING */}
      {step === "saving" && (
        <div className={`rounded-3xl border ${cardBg} p-12 shadow-sm text-center`}>
          <Loader2 size={32} className="text-emerald-500 animate-spin mx-auto mb-4" />
          <p className="font-bold">Salvataggio in corso...</p>
        </div>
      )}

      {/* STEP: DONE */}
      {step === "done" && saveResult && (
        <div className={`rounded-3xl border ${cardBg} p-8 shadow-sm text-center`}>
          <div className="w-16 h-16 mx-auto mb-4 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
            <CheckCircle size={32} className="text-emerald-500" />
          </div>
          <h2 className="text-lg font-black mb-2">Importazione Completata!</h2>
          <p className={`text-sm ${mutedText} mb-4`}>
            {saveResult.veicoliImportati} veicoli importati con successo.
          </p>
          {saveResult.warnings?.length > 0 && (
            <div className="mb-4 p-3 bg-amber-500/10 rounded-xl text-amber-500 text-xs font-bold text-left">
              {saveResult.warnings.map((w: string, i: number) => <p key={i}>⚠ {w}</p>)}
            </div>
          )}
          <div className="flex gap-3 justify-center">
            <button onClick={reset} className={`px-4 py-2.5 text-sm font-bold rounded-xl ${isDark ? "bg-white/5 hover:bg-white/10" : "bg-slate-100 hover:bg-slate-200"}`}>
              Importa altra scheda
            </button>
            <button onClick={onImportComplete} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl">
              Vai alla lista
            </button>
          </div>
        </div>
      )}

      {/* Modal Ingrandimento Schermo Intero per Controllo Dettagli/Targhe con Tasto Torna Indietro */}
      {isZoomModalOpen && preview && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-lg flex flex-col animate-in fade-in duration-200 p-4 select-none"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsZoomModalOpen(false)
          }}
        >
          {/* Header del Modal con Tasto Evidente Torna Indietro e Chiudi */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0 gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsZoomModalOpen(false)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm shadow-lg border border-white/10 transition-all active:scale-95"
              >
                <ArrowLeft size={18} className="text-purple-400" /> Torna alla Scheda
              </button>
              <div className="hidden sm:flex items-center gap-2 border-l border-white/10 pl-3">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <ZoomIn size={16} className="text-purple-400" /> Controllo Targhe HD
                </h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono font-bold">
                  {Math.round(modalZoomScale * 100)}%
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setModalZoomScale(s => Math.max(0.5, s - 0.25))}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all"
                title="Riduci zoom"
              >
                <ZoomOut size={18} />
              </button>
              <button
                type="button"
                onClick={() => setModalZoomScale(1)}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all"
              >
                100%
              </button>
              <button
                type="button"
                onClick={() => setModalZoomScale(s => Math.min(4, s + 0.25))}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all"
                title="Aumenta zoom"
              >
                <ZoomIn size={18} />
              </button>
              <div className="w-px h-6 bg-white/10 mx-1" />
              
              {/* Tasto Chiudi ben visibile */}
              <button
                type="button"
                onClick={() => setIsZoomModalOpen(false)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-lg shadow-rose-600/40 transition-all active:scale-95"
                title="Chiudi vista schermo intero (Premere ESC)"
              >
                <X size={18} /> CHIUDI (ESC)
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4 flex items-center justify-center min-h-0 cursor-grab active:cursor-grabbing">
            <div 
              className="transition-transform duration-100 ease-out max-w-none shadow-2xl rounded-xl overflow-hidden border border-white/10"
              style={{ transform: `scale(${modalZoomScale})`, transformOrigin: 'top center' }}
            >
              <img src={preview} alt="Scansione Ingrandita" className="max-w-none h-auto select-none display-block pointer-events-none" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Reusable input field component
function InputField({ label, value, onChange, inputBg, bold }: {
  label: string; value?: string | null; onChange: (val: string) => void; inputBg: string; bold?: boolean
}) {
  return (
    <div>
      <label className="text-[9px] font-bold uppercase tracking-widest opacity-40 mb-0.5 block">{label}</label>
      <input value={value || ''} onChange={e => onChange(e.target.value)}
        className={`w-full px-2 py-1.5 rounded-lg border text-sm ${bold ? 'font-bold' : ''} ${inputBg}`} />
    </div>
  )
}
