import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const session = await auth()
  
  if (session?.user?.role !== "ADMIN" && !session?.user?.canManageShifts) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { hash, type, metadata } = await req.json()

    if (!hash || !type) {
      return NextResponse.json({ error: "Missing hash or type" }, { status: 400 })
    }

    const doc = await prisma.certifiedDocument.create({
      data: {
        tenantId: session.user.tenantId || null,
        hash,
        type,
        issuerId: session.user.id,
        issuerName: session.user.name || "Admin",
        metadata: JSON.stringify(metadata)
      }
    })

    return NextResponse.json({ success: true, documentId: doc.id })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "Document already certified" }, { status: 409 })
    }
    console.error("Certify Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
