import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { authenticator } from "otplib"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { token } = await req.json()
    
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user || !user.twoFactorSecret) {
      return NextResponse.json({ error: "2FA non configurato" }, { status: 400 })
    }

    const isValid = authenticator.verify({
      token,
      secret: user.twoFactorSecret
    })

    if (!isValid) {
      return NextResponse.json({ error: "Codice non valido" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[2FA VERIFY ERROR]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
