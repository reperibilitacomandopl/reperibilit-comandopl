import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
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
