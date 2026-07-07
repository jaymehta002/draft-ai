import Link from "next/link"
import { Trophy, ExternalLink } from "lucide-react"
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDateTime } from "@/lib/format-date"

type TrophyItem = {
  id: string
  recipientName: string
  platform: string
  actionMode: string
  excerpt: string
  responseReceivedAt: string
  postUrl: string | null
}

type TrophyCaseProps = {
  replies: TrophyItem[]
}

export function TrophyCase({ replies }: TrophyCaseProps) {
  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-2">
        <CardDescription className="text-[10px] font-semibold uppercase tracking-widest flex items-center gap-2">
          <Trophy className="size-3" /> Reply trophy case
        </CardDescription>
      </CardHeader>
      <CardContent>
        {replies.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            Your first reply will appear here — keep starting conversations.
          </p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
            {replies.map((r) => (
              <div
                key={r.id}
                className="min-w-[180px] shrink-0 rounded-xl border border-border bg-muted/30 p-3"
              >
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {(r.recipientName[0] || "?").toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-foreground">
                      {r.recipientName}
                    </p>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                      {r.platform}
                    </Badge>
                  </div>
                </div>
                <p className="line-clamp-2 text-[10px] italic text-muted-foreground">
                  &ldquo;{r.excerpt}&rdquo;
                </p>
                <p className="mt-2 text-[10px] text-muted-foreground">
                  {formatDateTime(r.responseReceivedAt)}
                </p>
                {r.postUrl && (
                  <Link
                    href={r.postUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-0.5 text-[10px] text-primary hover:underline"
                  >
                    View post <ExternalLink className="size-2.5" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
