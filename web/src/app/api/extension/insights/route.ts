import { NextResponse } from "next/server"
import { authenticateBearerRequest } from "@/lib/bearer-auth"
import { getUserReplyMetrics } from "@/lib/reply-metrics"
import { recommendTone } from "@/lib/tone-recommendation"
import { checkEntitlement, UPGRADE_URL } from "@/lib/entitlements"

export async function GET(req: Request) {
  try {
    const auth = await authenticateBearerRequest(req, {
      limit: 60,
      windowMs: 60 * 60 * 1000,
    })
    if (auth.error) return auth.error

    const profile = auth.apiKey!.user.candidateProfile
    const metrics = await getUserReplyMetrics(auth.apiKey!.userId)

    // Tone recommendations are a Pro+ feature; reply-rate stats stay free.
    const insightCheck = await checkEntitlement(auth.apiKey!.userId, "insight")
    const recommendation = insightCheck.allowed
      ? recommendTone(metrics, profile?.outreachTone || "professional")
      : null

    return NextResponse.json({
      toneInsights: metrics.toneInsights,
      recommendation,
      recommendationLocked: !insightCheck.allowed,
      upgradeUrl: insightCheck.allowed ? undefined : UPGRADE_URL,
      replyRate: metrics.replyRate,
    })
  } catch (error) {
    console.error("Extension insights error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
