import { NextResponse } from "next/server"
import { authenticateBearerRequest } from "@/lib/bearer-auth"
import { getUserReplyMetrics } from "@/lib/reply-metrics"
import { recommendTone } from "@/lib/tone-recommendation"

export async function GET(req: Request) {
  try {
    const auth = await authenticateBearerRequest(req, {
      limit: 60,
      windowMs: 60 * 60 * 1000,
    })
    if (auth.error) return auth.error

    const profile = auth.apiKey!.user.candidateProfile
    const metrics = await getUserReplyMetrics(auth.apiKey!.userId)
    const recommendation = recommendTone(
      metrics,
      profile?.outreachTone || "professional"
    )

    return NextResponse.json({
      toneInsights: metrics.toneInsights,
      recommendation,
      replyRate: metrics.replyRate,
    })
  } catch (error) {
    console.error("Extension insights error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
