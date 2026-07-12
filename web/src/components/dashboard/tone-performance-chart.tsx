import type { UserReplyMetrics } from "@/lib/reply-metrics"
import { recommendTone } from "@/lib/tone-recommendation"
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TrendingUp, Lock } from "lucide-react"
import Link from "next/link"
import { UPGRADE_URL } from "@/lib/plans"

type TonePerformanceChartProps = {
  byTone: UserReplyMetrics["byTone"]
  fallbackTone?: string
  /** Tone insights are a Pro-only feature — render an upsell instead of real data when locked. */
  locked?: boolean
}

export function TonePerformanceChart({ byTone, fallbackTone, locked }: TonePerformanceChartProps) {
  if (locked) {
    return (
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardDescription className="text-[10px] font-semibold uppercase tracking-widest flex items-center gap-2">
            <TrendingUp className="size-3" /> Tone performance
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
          <Lock className="size-5 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            See which tone gets the best reply rate for you. Pro feature.
          </p>
          <Button size="sm" variant="outline" asChild>
            <Link href={UPGRADE_URL}>Upgrade to Pro</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const entries = Object.entries(byTone)
    .filter(([tone]) => tone !== "unknown")
    .sort((a, b) => b[1].rate - a[1].rate)

  if (entries.length === 0) {
    return (
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardDescription className="text-[10px] font-semibold uppercase tracking-widest flex items-center gap-2">
            <TrendingUp className="size-3" /> Tone performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground py-4 text-center">
            Send a few conversations to see which tone works best for you.
          </p>
        </CardContent>
      </Card>
    )
  }

  const maxRate = Math.max(...entries.map(([, b]) => b.rate), 1)
  const recommendation = recommendTone(
    {
      totalSent: 0,
      totalReplied: 0,
      replyRate: 0,
      replyRate7d: 0,
      repliedThisWeek: 0,
      byChannel: { EMAIL: { sent: 0, replied: 0, rate: 0 }, DM: { sent: 0, replied: 0, rate: 0 } },
      byPlatform: {},
      byTone,
      toneInsights: entries.map(([tone, bucket]) => ({
        tone,
        sent: bucket.sent,
        replied: bucket.replied,
        rate: bucket.rate,
        message: "",
      })),
    },
    fallbackTone
  )

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-2">
        <CardDescription className="text-[10px] font-semibold uppercase tracking-widest flex items-center gap-2">
          <TrendingUp className="size-3" /> Tone performance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {entries.map(([tone, bucket]) => {
          const isRecommended = tone === recommendation.tone && recommendation.confidence !== "low"
          const width = maxRate > 0 ? (bucket.rate / maxRate) * 100 : 0
          return (
            <div key={tone} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span
                  className={`font-medium capitalize ${isRecommended ? "text-primary" : "text-muted-foreground"}`}
                >
                  {tone}
                  {isRecommended && (
                    <span className="ml-1.5 text-[10px] text-primary">recommended</span>
                  )}
                </span>
                <span className="font-semibold tabular-nums text-foreground">
                  {bucket.rate}% ({bucket.replied}/{bucket.sent})
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-[width] duration-500 ${isRecommended ? "bg-primary" : "bg-primary/50"}`}
                  style={{
                    width: `${width}%`,
                    transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)",
                  }}
                />
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
