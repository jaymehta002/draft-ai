import { MILESTONE_LABELS, type MilestoneId } from "@/lib/engagement"
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card"
import { Award, Lock } from "lucide-react"
import { cn } from "@/lib/utils"

const ALL_MILESTONES: MilestoneId[] = [
  "FIRST_DRAFT",
  "FIRST_SEND",
  "FIRST_REPLY",
  "STREAK_3",
  "STREAK_7",
  "CONVERSATIONS_10",
  "REPLY_RATE_20",
]

type MilestoneBadgesProps = {
  unlocked: MilestoneId[]
}

export function MilestoneBadges({ unlocked }: MilestoneBadgesProps) {
  const unlockedSet = new Set(unlocked)

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-2">
        <CardDescription className="text-[10px] font-semibold uppercase tracking-widest flex items-center gap-2">
          <Award className="size-3" /> Milestones
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          {ALL_MILESTONES.map((id) => {
            const isUnlocked = unlockedSet.has(id)
            return (
              <div
                key={id}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs",
                  isUnlocked
                    ? "border-primary/30 bg-primary/5 text-foreground"
                    : "border-border bg-muted/20 text-muted-foreground"
                )}
              >
                {isUnlocked ? (
                  <Award className="size-3.5 shrink-0 text-primary" />
                ) : (
                  <Lock className="size-3.5 shrink-0 opacity-50" />
                )}
                <span className="font-medium leading-tight">{MILESTONE_LABELS[id]}</span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
