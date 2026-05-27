import { NextResponse } from "next/server"
import { processEmailQueue } from "@/lib/email-sender"

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization")
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await processEmailQueue()
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error("[CRON_PROCESS_EMAIL_QUEUE_ERROR]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
