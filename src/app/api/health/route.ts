import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    // Verifica minima del database
    await prisma.$queryRaw`SELECT 1`
    
    return NextResponse.json({ 
      status: "healthy", 
      timestamp: new Date().toISOString(),
      service: "portale-caserma-api"
    }, { status: 200 })
  } catch (error) {
    console.error("[HEALTH_CHECK_ERROR]", error)
    return NextResponse.json({ 
      status: "unhealthy", 
      error: error instanceof Error ? error.message : "Database connection failed" 
    }, { status: 503 })
  }
}
