import { NextResponse } from "next/server"
import { sendPendingDraftDigests } from "@/lib/digest/pending-drafts"

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await sendPendingDraftDigests()
    return NextResponse.json(result)
  } catch (error) {
    console.error("Weekly digest cron error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
