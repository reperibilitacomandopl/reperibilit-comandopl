import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { generateUploadUrl } from "@/lib/s3"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const { id: accidentId } = await params;
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tenantId = session.user.tenantId

  try {
    const { filename, contentType } = await req.json()

    if (!filename || !contentType) {
      return NextResponse.json({ error: "Missing filename or contentType" }, { status: 400 })
    }

    // Verify accident belongs to tenant and agent
    const accident = await prisma.accidentReport.findUnique({
      where: { id: accidentId }
    })

    if (!accident || accident.tenantId !== tenantId) {
      return NextResponse.json({ error: "Accident not found" }, { status: 404 })
    }

    // Generate a unique key for S3
    const key = `tenants/${tenantId}/accidents/${accidentId}/${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`

    const uploadUrl = await generateUploadUrl(key, contentType, 10) // 10MB limit (handled by client/S3 POST if we switch to POST)

    return NextResponse.json({ uploadUrl, key })
  } catch (error) {
    console.error("[POST_ACCIDENT_UPLOAD_URL_ERROR]", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
