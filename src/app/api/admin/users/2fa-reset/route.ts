import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user || !session.user.canManageUsers) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { userId } = await req.json()
    
    if (!userId) {
      return NextResponse.json({ error: "UserId missing" }, { status: 400 })
    }

    await prisma.user.update({
      where: { id: userId },
      data: { 
        twoFactorEnabled: false, 
        twoFactorSecret: null 
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[2FA RESET ERROR]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
