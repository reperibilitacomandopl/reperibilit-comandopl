import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100
    })
    return NextResponse.json(logs)
  } catch (error) {
    console.error("[AUDIT GET ERROR]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
