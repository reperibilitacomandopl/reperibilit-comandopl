"use client"

import { ThemeProvider } from "@/hooks/useTheme"

export default function ThemeWrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>
}
