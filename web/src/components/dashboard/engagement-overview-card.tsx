import { TrendingUp, Zap } from "lucide-react"
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card"
import { ReplyRateRing } from "@/components/dashboard/reply-rate-ring"

type EngagementOverviewCardProps = {
  replyRate: number
  replySublabel: string
  platformBreakdown: Record<string, number>
  cacheHits?: number
  tokensSavedEstimate?: number
}

export function EngagementOverviewCard({
  replyRate,
  replySublabel,
  platformBreakdown,
  cacheHits = 0,
  tokensSavedEstimate = 0,
}: EngagementOverviewCardProps) {
  const entries = Object.entries(platformBreakdown)
  const total = entries.reduce((sum, [, count]) => sum + count, 0)

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardDescription className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest">
          <TrendingUp className="size-3" /> Engagement overview
        </CardDescription>
        {cacheHits > 0 && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/8 px-2.5 py-1 text-[10px] font-medium text-primary">
            <Zap className="size-3" />
            {cacheHits} cache hit{cacheHits !== 1 ? "s" : ""} · ~{tokensSavedEstimate.toLocaleString()} tokens saved
          </span>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
          <div className="flex justify-center border-border pb-4 sm:justify-start sm:border-r sm:pb-0 sm:pr-6">
            <ReplyRateRing rate={replyRate} sublabel={replySublabel} />
          </div>
          <div className="space-y-2.5">
            <p className="text-xs font-medium text-muted-foreground">By platform</p>
            {entries.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                No conversations yet — your first thoughtful note is one draft away.
              </p>
            ) : (
              <div className="space-y-2.5">
                {entries.map(([platform, count]) => {
                  const pct = total > 0 ? (count / total) * 100 : 0
                  return (
                    <div key={platform} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-muted-foreground">{platform}</span>
                        <span className="font-semibold tabular-nums text-foreground">{count}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-[width] duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
