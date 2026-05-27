import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const { id: accidentId } = await params
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const tenantId = session.user.tenantId

  try {
    const accident = await prisma.accidentReport.findUnique({
      where: { id: accidentId },
      include: { forensicPhotos: true }
    })

    if (!accident || accident.tenantId !== tenantId) {
      return NextResponse.json({ error: "Accident not found" }, { status: 404 })
    }

    return NextResponse.json(accident.forensicPhotos)
  } catch (error) {
    console.error("[GET_ACCIDENT_PHOTOS_ERROR]", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const { id: accidentId } = await params
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const tenantId = session.user.tenantId

  try {
    const accident = await prisma.accidentReport.findUnique({ where: { id: accidentId } })
    if (!accident || accident.tenantId !== tenantId) {
      return NextResponse.json({ error: "Accident not found" }, { status: 404 })
    }
    if (accident.status === "CHIUSO") {
      return NextResponse.json({ error: "Cannot modify closed accident" }, { status: 400 })
    }

    const { url, hashSha256, category, gpsLat, gpsLng } = await req.json()

    if (!url || !category) {
      return NextResponse.json({ error: "Missing required fields (url, category)" }, { status: 400 })
    }

    const photo = await prisma.accidentPhoto.create({
      data: {
        accidentReportId: accidentId,
        url,
        hashSha256: hashSha256 || null,
        category,
        gpsLat: gpsLat || null,
        gpsLng: gpsLng || null,
      }
    })

    // Update old photos array just for backward compatibility (if needed)
    await prisma.accidentReport.update({
      where: { id: accidentId },
      data: { photos: { push: url } }
    })

    return NextResponse.json(photo)
  } catch (error) {
    console.error("[POST_ACCIDENT_PHOTO_ERROR]", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const { id: accidentId } = await params
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const tenantId = session.user.tenantId

  try {
    const url = new URL(req.url)
    const photoId = url.searchParams.get("photoId")
    if (!photoId) return NextResponse.json({ error: "photoId required" }, { status: 400 })

    const accident = await prisma.accidentReport.findUnique({ where: { id: accidentId } })
    if (!accident || accident.tenantId !== tenantId) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (accident.status === "CHIUSO") return NextResponse.json({ error: "Cannot modify closed accident" }, { status: 400 })

    await prisma.accidentPhoto.delete({ where: { id: photoId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[DELETE_ACCIDENT_PHOTO_ERROR]", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
