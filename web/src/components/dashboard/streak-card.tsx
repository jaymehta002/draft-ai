import { Flame } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

type StreakCardProps = {
  currentStreak: number
  longestStreak: number
}

export function StreakCard({ currentStreak, longestStreak }: StreakCardProps) {
  if (currentStreak === 0) {
    return (
      <Card className="border-border shadow-sm">
        <CardContent className="flex items-center gap-3 py-4">
          <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Flame className="size-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Start your streak</p>
            <p className="text-xs text-muted-foreground">
              Draft or start a conversation today
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-orange-200/60 bg-orange-50/50 shadow-sm">
      <CardContent className="flex items-center gap-3 py-4">
        <div className="flex size-10 items-center justify-center rounded-full bg-orange-100 text-orange-600">
          <Flame className="size-5" />
        </div>
        <div>
          <p className="text-2xl font-bold tabular-nums tracking-tight text-orange-700">
            {currentStreak}
            <span className="ml-1.5 text-sm font-medium">day streak</span>
          </p>
          <p className="text-xs text-orange-600/80">
            Best: {longestStreak} day{longestStreak !== 1 ? "s" : ""}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
