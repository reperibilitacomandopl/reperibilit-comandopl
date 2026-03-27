import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session || !session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { newPassword } = await req.json()
    if (!newPassword || newPassword.length < 6) return NextResponse.json({ error: "Password troppo corta" }, { status: 400 })

    const hashed = await bcrypt.hash(newPassword, 10)
    
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        password: hashed,
        forcePasswordChange: false
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
