import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { blockInProduction } from "@/lib/dev-only"

export async function GET() {
  const blocked = blockInProduction()
  if (blocked) return blocked

  try {
    const count = await prisma.user.count()
    const users = await prisma.user.findMany({
      select: { matricola: true, role: true },
      take: 5
    })
    return NextResponse.json({ 
      status: "SUCCESS", 
      message: "Database connected", 
      count,
      sample: users
    })
  } catch (error: any) {
    console.error("[DB TEST ERROR]", error)
    return NextResponse.json({ 
      status: "ERROR", 
      message: error.message,
      code: error.code,
      meta: error.meta
    }, { status: 500 })
  }
}
