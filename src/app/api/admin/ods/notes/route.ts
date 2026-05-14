import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const dateStr = searchParams.get("date")
  if (!dateStr) return NextResponse.json({ error: "Date required" }, { status: 400 })

  const date = new Date(dateStr)
  date.setHours(0, 0, 0, 0)

  try {
    const note = await prisma.dailyOdsNote.findUnique({
      where: {
        tenantId_date: {
          tenantId: session.user.tenantId || "",
          date: date
        }
      }
    })
    return NextResponse.json({ note })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { date: dateStr, content } = await req.json()
    if (!dateStr) return NextResponse.json({ error: "Date required" }, { status: 400 })

    const date = new Date(dateStr)
    date.setHours(0, 0, 0, 0)

    const note = await prisma.dailyOdsNote.upsert({
      where: {
        tenantId_date: {
          tenantId: session.user.tenantId || "",
          date: date
        }
      },
      update: {
        content
      },
      create: {
        tenantId: session.user.tenantId || "",
        date: date,
        content
      }
    })

    return NextResponse.json({ success: true, note })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
