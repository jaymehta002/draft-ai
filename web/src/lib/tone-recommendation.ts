import type { UserReplyMetrics } from "@/lib/reply-metrics"

export type ToneRecommendation = {
  tone: string
  reason: string
  confidence: "low" | "medium" | "high"
}

export function recommendTone(
  metrics: UserReplyMetrics,
  fallbackTone = "professional",
  _postIndustry?: string | null
): ToneRecommendation {
  void _postIndustry
  const avgRate = metrics.replyRate

  const best = metrics.toneInsights.find((t) => t.sent >= 5 && t.rate > avgRate * 1.5)

  if (best) {
    const multiplier = avgRate > 0 ? (best.rate / avgRate).toFixed(1) : "2"
    return {
      tone: best.tone,
      reason: `${capitalize(best.tone)} tone gets ${multiplier}× your average reply rate`,
      confidence: best.sent >= 10 ? "high" : "medium",
    }
  }

  const anyInsight = metrics.toneInsights[0]
  if (anyInsight && anyInsight.sent >= 5) {
    return {
      tone: anyInsight.tone,
      reason: `${capitalize(anyInsight.tone)} tone: ${anyInsight.rate}% reply rate (${anyInsight.replied}/${anyInsight.sent})`,
      confidence: "medium",
    }
  }

  return {
    tone: fallbackTone,
    reason: "Using your default tone — send more to unlock personalized insights",
    confidence: "low",
  }
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
