import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && !session?.user?.canConfigureSystem) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tenantId = session.user.tenantId
  const schools = await prisma.school.findMany({
    where: { tenantId },
    include: { schedules: true },
    orderBy: { name: "asc" }
  })

  return NextResponse.json(schools)
}

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && !session?.user?.canConfigureSystem) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { name } = await req.json()
    const tenantId = session.user.tenantId

    const school = await prisma.school.create({
      data: {
        name,
        tenantId,
        schedules: {
          create: [0, 1, 2, 3, 4, 5, 6].map(dow => ({
            dayOfWeek: dow,
            entranceTime: "07:45-08:30",
            exitTime: "13:00-14:00"
          }))
        }
      },
      include: { schedules: true }
    })

    return NextResponse.json(school)
  } catch (error) {
    return NextResponse.json({ error: "Errore durante la creazione" }, { status: 500 })
  }
}
