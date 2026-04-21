"use client"

import React, { Component, ErrorInfo, ReactNode } from "react"
import { AlertTriangle, RefreshCcw } from "lucide-react"

interface Props {
  children?: ReactNode
  fallback?: ReactNode
  name?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`ErrorBoundary caught an error in ${this.props.name || 'Component'}:`, error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="w-full h-full min-h-[200px] flex flex-col items-center justify-center p-8 bg-rose-50/50 border border-rose-100 rounded-[2rem] text-center">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-rose-500 shadow-lg shadow-rose-200/50 mb-6">
            <AlertTriangle size={32} />
          </div>
          <h3 className="text-xl font-black text-rose-900 mb-2 tracking-tight uppercase">
             Errore Applicativo
          </h3>
          <p className="text-sm font-bold text-rose-700/70 max-w-md mx-auto mb-6">
             Si è verificato un problema caricando il modulo <span className="font-black">"{this.props.name || 'sconosciuto'}"</span>. Il resto del portale funziona regolarmente.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="flex items-center gap-2 bg-white text-rose-600 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest border border-rose-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all active:scale-95"
          >
            <RefreshCcw size={16} /> Riprova
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
