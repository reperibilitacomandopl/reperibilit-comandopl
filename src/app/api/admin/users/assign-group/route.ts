import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

// Gestisce drag&drop agente dentro una squadra, o settaggio del giorno di riposo
export async function PUT(request: Request) {
  const session = await auth()
  if (!session?.user || (session.user.role !== "ADMIN" && !session?.user?.canManageUsers)) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })

  try {
    const { userId, rotationGroupId, fixedRestDay } = await request.json()

    // fixedRestDay può essere undefined/null
    // rotationGroupId può essere null (rimozione dalla squadra)
    
    const updateData: any = {}
    if (rotationGroupId !== undefined) updateData.rotationGroupId = rotationGroupId
    if (fixedRestDay !== undefined) updateData.fixedRestDay = fixedRestDay
    
    await prisma.user.update({
      where: { id: userId },
      data: updateData
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 })
  }
}
