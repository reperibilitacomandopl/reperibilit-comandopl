import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getEntitlementStatus } from "@/lib/entitlements"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1))
  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()))

  try {
    const status = await getEntitlementStatus(session.user.id, month, year)
    return NextResponse.json({ status })
  } catch (error) {
    console.error("[AGENT_ENTITLEMENTS_GET]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
