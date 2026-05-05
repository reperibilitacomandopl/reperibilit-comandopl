"use client"

import React, { useState, useRef, useCallback } from "react"

interface HoldButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onHoldComplete: () => void
  holdDuration?: number
  children: (pressing: boolean, progress: number) => React.ReactNode
}

export default function HoldButton({ 
  onHoldComplete, 
  holdDuration = 2500, 
  children,
  className,
  ...props 
}: HoldButtonProps) {
  const [pressing, setPressing] = useState(false)
  const [progress, setProgress] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef(0)

  const startPress = useCallback(() => {
    setPressing(true)
    setProgress(0)
    startTimeRef.current = Date.now()

    animRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current
      const p = Math.min(elapsed / holdDuration, 1)
      setProgress(p)
      if (p >= 1 && animRef.current) {
        clearInterval(animRef.current)
      }
    }, 30)

    timerRef.current = setTimeout(() => {
      setPressing(false)
      setProgress(0)
      if (animRef.current) clearInterval(animRef.current)
      if (navigator.vibrate) navigator.vibrate(200)
      onHoldComplete()
    }, holdDuration)
  }, [holdDuration, onHoldComplete])

  const cancelPress = useCallback(() => {
    setPressing(false)
    setProgress(0)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (animRef.current) clearInterval(animRef.current)
  }, [])

  return (
    <button
      {...props}
      onMouseDown={(e) => { startPress(); props.onMouseDown?.(e) }}
      onMouseUp={(e) => { cancelPress(); props.onMouseUp?.(e) }}
      onMouseLeave={(e) => { cancelPress(); props.onMouseLeave?.(e) }}
      onTouchStart={(e) => { startPress(); props.onTouchStart?.(e) }}
      onTouchEnd={(e) => { cancelPress(); props.onTouchEnd?.(e) }}
      onTouchCancel={(e) => { cancelPress(); props.onTouchCancel?.(e) }}
      className={`${className || ''} ${pressing ? "scale-[0.98] brightness-110" : ""}`}
    >
      {children(pressing, progress)}
    </button>
  )
}
