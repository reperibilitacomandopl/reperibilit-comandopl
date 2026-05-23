"use client"
import dynamic from "next/dynamic"
import { RefreshCw } from "lucide-react"

// Direct import instead of dynamic to avoid mobile chunk loading issues
import AgentDashboardComponent from "./AgentDashboard"

export default function DynamicAgentDashboard(props: any) {
  return <AgentDashboardComponent {...props} />
}
