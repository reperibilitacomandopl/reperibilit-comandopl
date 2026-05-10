import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session || !session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { newPassword } = await req.json()
    
    // Validazione AgID-compliant
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/
    if (!newPassword || !passwordRegex.test(newPassword)) {
      return NextResponse.json({ 
        error: "La password deve contenere almeno 8 caratteri, una maiuscola, una minuscola, un numero e un carattere speciale" 
      }, { status: 400 })
    }

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
