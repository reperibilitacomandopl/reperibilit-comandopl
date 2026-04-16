"use client"

import React, { createContext, useContext } from "react"
import { DashboardAgent, DashboardShift } from "@/types/dashboard"

interface AdminStateContextType {
  currentYear: number
  currentMonth: number
  currentMonthName: string
  isPublished: boolean
  allAgents: any[]
  shifts: any[]
  tenantSlug?: string | null
  settings?: any
  fetchAgentBalances: (userId: string) => Promise<any>
}

const AdminStateContext = createContext<AdminStateContextType | undefined>(undefined)

export function AdminStateProvider({ children, value }: { children: React.ReactNode, value: AdminStateContextType }) {
  return (
    <AdminStateContext.Provider value={value}>
      {children}
    </AdminStateContext.Provider>
  )
}

export function useAdminState() {
  const context = useContext(AdminStateContext)
  if (context === undefined) {
    throw new Error("useAdminState must be used within an AdminStateProvider")
  }
  return context
}
