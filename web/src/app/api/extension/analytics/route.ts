import { NextResponse } from "next/server"
import { validateApiKey } from "@/lib/api-key"
import { getUserStats } from "@/lib/user-stats"
import { getUserReplyMetrics } from "@/lib/reply-metrics"

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split(" ")[1]
    const apiKey = await validateApiKey(token)

    if (!apiKey) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 })
    }

    const [stats, replyMetrics] = await Promise.all([
      getUserStats(apiKey.userId),
      getUserReplyMetrics(apiKey.userId),
    ])

    return NextResponse.json({
      ...stats,
      totalReplied: replyMetrics.totalReplied,
      repliedThisWeek: replyMetrics.repliedThisWeek,
      replyRate: replyMetrics.replyRate,
      replyRate7d: replyMetrics.replyRate7d,
    })
  } catch (error) {
    console.error("Extension analytics error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
